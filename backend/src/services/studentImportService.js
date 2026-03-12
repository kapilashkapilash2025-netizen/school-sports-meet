import { query } from "../config/db.js";
import { createStudentsBulk } from "./studentService.js";
import { spawn } from "child_process";
import path from "path";

const pythonServiceBaseUrl = "http://127.0.0.1:8765";
const requirementsPath = path.resolve(process.cwd(), "requirements.txt");
const pythonServerPath = path.resolve(process.cwd(), "server.py");
const localPyDepsPath = path.resolve(process.cwd(), ".pydeps");

const houseLabelMap = {
  VALUVAR: "Valluvar",
  BARATHI: "Barathi",
  VIPULANTHAR: "Vipulananthar",
  NAVALAR: "Navalar"
};

let pythonProc = null;
let pythonCandidate = null;
let serviceBootPromise = null;

const pythonCandidates = [
  { cmd: "python", baseArgs: [] },
  { cmd: "py", baseArgs: ["-3"] }
];

function normalizeName(value) {
  return String(value || "").trim().replace(/\s+/g, " ").toLowerCase();
}

function normalizeDobValue(value) {
  const raw = String(value ?? "").trim();
  if (!raw || raw === "-") return null;
  return raw;
}

function buildDuplicateKey(row) {
  const dob = normalizeDobValue(row.date_of_birth);
  return `${normalizeName(row.name)}|${dob || ""}`;
}

function withPythonEnv() {
  return {
    ...process.env,
    PYTHONPATH: process.env.PYTHONPATH
      ? `${localPyDepsPath}${path.delimiter}${process.env.PYTHONPATH}`
      : localPyDepsPath
  };
}

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      windowsHide: true,
      cwd: process.cwd(),
      env: withPythonEnv(),
      ...options
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (data) => {
      stdout += String(data);
    });

    child.stderr.on("data", (data) => {
      stderr += String(data);
    });

    child.on("error", reject);

    child.on("close", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }
      reject(new Error(stderr || stdout || `Command failed: ${command}`));
    });
  });
}

async function detectPython() {
  for (const candidate of pythonCandidates) {
    try {
      await runCommand(candidate.cmd, [...candidate.baseArgs, "--version"]);
      return candidate;
    } catch {
      // try next
    }
  }

  throw Object.assign(new Error("Python 3 is required. Install from python.org"), {
    statusCode: 500
  });
}

async function ensurePythonDeps(candidate) {
  const importCheck = "import flask, flask_cors, pdf2image, pytesseract, cv2, pandas, PIL, regex, pdfplumber";

  try {
    await runCommand(candidate.cmd, [...candidate.baseArgs, "-c", importCheck]);
    return;
  } catch {
    // install below
  }

  try {
    await runCommand(candidate.cmd, [
      ...candidate.baseArgs,
      "-m",
      "pip",
      "install",
      "-r",
      requirementsPath,
      "--target",
      localPyDepsPath
    ]);
    await runCommand(candidate.cmd, [...candidate.baseArgs, "-c", importCheck]);
  } catch {
    throw Object.assign(
      new Error("Install dependency: pip install -r requirements.txt"),
      { statusCode: 500 }
    );
  }
}

async function waitForHealth(timeoutMs = 15000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const res = await fetch(`${pythonServiceBaseUrl}/health`);
      if (res.ok) return;
    } catch {
      // retry
    }

    await new Promise((resolve) => setTimeout(resolve, 400));
  }

  throw Object.assign(
    new Error("PDF parser service could not start. Check Python and dependencies."),
    { statusCode: 500 }
  );
}

async function ensurePythonServiceRunning() {
  if (serviceBootPromise) {
    await serviceBootPromise;
    return;
  }

  serviceBootPromise = (async () => {
    pythonCandidate = pythonCandidate || await detectPython();
    await ensurePythonDeps(pythonCandidate);

    try {
      const res = await fetch(`${pythonServiceBaseUrl}/health`);
      if (res.ok) return;
    } catch {
      // start service
    }

    pythonProc = spawn(
      pythonCandidate.cmd,
      [...pythonCandidate.baseArgs, pythonServerPath],
      {
        windowsHide: true,
        cwd: process.cwd(),
        env: withPythonEnv(),
        stdio: "ignore"
      }
    );

    pythonProc.on("exit", () => {
      pythonProc = null;
      serviceBootPromise = null;
    });

    await waitForHealth();
  })();

  try {
    await serviceBootPromise;
  } finally {
    if (!pythonProc) {
      serviceBootPromise = null;
    }
  }
}

async function extractRowsWithPythonService(files) {
  await ensurePythonServiceRunning();

  if (!Array.isArray(files) || files.length === 0) {
    throw Object.assign(new Error("PDF file is required"), { statusCode: 400 });
  }

  const form = new FormData();
  files.forEach((file, index) => {
    form.append(
      "files",
      new Blob([file.buffer], { type: file.mimetype || "application/pdf" }),
      file.originalname || `students-${index + 1}.pdf`
    );
  });

  let res;
  try {
    res = await fetch(`${pythonServiceBaseUrl}/import_pdf`, {
      method: "POST",
      body: form
    });
  } catch {
    throw Object.assign(
      new Error("Python 3 is required. Install from python.org"),
      { statusCode: 500 }
    );
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg = String(data?.message || "PDF parsing failed");

    if (
      msg.toLowerCase().includes("missing dependencies") ||
      msg.toLowerCase().includes("pytesseract") ||
      msg.toLowerCase().includes("pdf2image") ||
      msg.toLowerCase().includes("opencv")
    ) {
      throw Object.assign(new Error("Install dependency: pip install -r requirements.txt"), {
        statusCode: 500
      });
    }

    throw Object.assign(new Error(msg), { statusCode: 500 });
  }

  return {
    rows: Array.isArray(data.rows) ? data.rows : [],
    parserReport: data.report || null
  };
}

async function getLatestGenderCounters() {
  const result = await query(
    `
      SELECT RIGHT(student_id, 1) AS suffix,
             MAX(CAST(SUBSTRING(student_id FROM 2 FOR 4) AS INTEGER)) AS max_no
      FROM students
      WHERE student_id ~ '^S[0-9]{4}[BG]$'
      GROUP BY RIGHT(student_id, 1)
    `
  );

  const counters = { B: 0, G: 0 };
  result.rows.forEach((row) => {
    counters[row.suffix] = Number(row.max_no || 0);
  });

  return counters;
}

async function loadDbDuplicateMap(rows) {
  const uniqueNames = [...new Set(rows.map((row) => normalizeName(row.name)).filter(Boolean))];
  if (!uniqueNames.length) return new Map();

  const result = await query(
    `
      SELECT
        s.id,
        s.student_id,
        s.name,
        s.date_of_birth::text AS dob,
        LOWER(TRIM(s.name)) AS name_key
      FROM students s
      WHERE LOWER(TRIM(s.name)) = ANY($1::text[])
    `,
    [uniqueNames]
  );

  const map = new Map();

  result.rows.forEach((row) => {
    map.set(`${row.name_key}|${row.dob || ""}`, {
      id: row.id,
      student_id: row.student_id,
      name: row.name
    });
  });

  return map;
}

async function annotateRows(rows) {
  const counts = new Map();
  rows.forEach((row) => {
    const key = buildDuplicateKey(row);
    counts.set(key, (counts.get(key) || 0) + 1);
  });

  const dbDuplicateMap = await loadDbDuplicateMap(rows);

  return rows.map((row, index) => {
    const duplicateKey = buildDuplicateKey(row);
    const duplicateInPdf = (counts.get(duplicateKey) || 0) > 1;
    const duplicateInDatabase = dbDuplicateMap.has(duplicateKey);
    const dbStudent = dbDuplicateMap.get(duplicateKey) || null;

    let defaultAction = "add";
    if (duplicateInDatabase) defaultAction = "skip";
    else if (duplicateInPdf) defaultAction = "skip";

    return {
      row_no: index + 1,
      ...row,
      duplicate_key: duplicateKey,
      duplicate_in_pdf: duplicateInPdf,
      duplicate_in_database: duplicateInDatabase,
      existing_student: dbStudent,
      default_action: defaultAction,
      house_label: houseLabelMap[row.house] || row.house
    };
  });
}

function toPreview(rows, counters) {
  const next = { ...counters };

  return rows.map((row) => {
    const suffix = row.gender === "Male" ? "B" : "G";
    next[suffix] += 1;
    const previewStudentId = `S${String(next[suffix]).padStart(4, "0")}${suffix}`;

    return {
      ...row,
      preview_student_id: previewStudentId
    };
  });
}

async function resolveHouseId(code) {
  const result = await query("SELECT id FROM houses WHERE code = $1 LIMIT 1", [String(code || "").toUpperCase()]);
  return result.rows[0]?.id || null;
}

async function replaceExistingStudent(existingId, row) {
  const houseId = await resolveHouseId(row.house);
  if (!houseId) {
    throw Object.assign(new Error("Invalid house assignment"), { statusCode: 400 });
  }

  await query(
    `
      UPDATE students
      SET name = $1,
          date_of_birth = $2,
          gender = $3,
          grade = COALESCE($4, grade),
          division = COALESCE(NULLIF($5, ''), division),
          house_id = $6,
          updated_at = NOW()
      WHERE id = $7
    `,
    [row.name, normalizeDobValue(row.date_of_birth), row.gender, row.grade || null, row.division || "", houseId, existingId]
  );
}

function buildImportPayload(previewRows) {
  const batchTag = `PDF${Date.now()}`;

  return previewRows.map((row, index) => ({
    name: row.name,
    date_of_birth: normalizeDobValue(row.date_of_birth),
    gender: row.gender,
    house: row.house,
    student_number: `${batchTag}-ST-${index + 1}`,
    birth_certificate_number: `${batchTag}-BC-${index + 1}`,
    nic_number: null,
    grade: row.grade || "06",
    division: row.division || "N/A"
  }));
}

async function parsePdfFiles(files) {
  if (!Array.isArray(files) || files.length === 0) {
    throw Object.assign(new Error("PDF file is required"), { statusCode: 400 });
  }

  const parsed = await extractRowsWithPythonService(files);

  if (parsed.rows.length === 0) {
    throw Object.assign(
      new Error("No students detected. Please check PDF format."),
      { statusCode: 400 }
    );
  }

  return parsed;
}

export async function previewStudentImport(files) {
  const parsed = await parsePdfFiles(files);
  const annotatedRows = await annotateRows(parsed.rows);
  const counters = await getLatestGenderCounters();
  const previewRows = toPreview(annotatedRows, counters);

  return {
    total_detected: previewRows.length,
    duplicate_in_pdf_count: previewRows.filter((row) => row.duplicate_in_pdf).length,
    duplicate_in_db_count: previewRows.filter((row) => row.duplicate_in_database).length,
    parser_report: parsed.parserReport,
    rows: previewRows
  };
}

export async function commitStudentImport(files, decisions = {}) {
  const parsed = await parsePdfFiles(files);
  const annotatedRows = await annotateRows(parsed.rows);

  const selectedForInsert = [];
  const rowsToReplace = [];
  let skippedCount = 0;

  for (const row of annotatedRows) {
    const action = decisions[String(row.row_no)] || row.default_action;

    if (row.duplicate_in_database) {
      if (action === "replace") {
        rowsToReplace.push(row);
      } else {
        skippedCount += 1;
      }
      continue;
    }

    if (row.duplicate_in_pdf && action !== "add") {
      skippedCount += 1;
      continue;
    }

    selectedForInsert.push(row);
  }

  const expectedRows = annotatedRows.length;
  const plannedProcessed = selectedForInsert.length + rowsToReplace.length + skippedCount;

  if (plannedProcessed !== expectedRows) {
    throw Object.assign(
      new Error(`Row mismatch detected. PDF rows: ${expectedRows}, Processed rows: ${plannedProcessed}. Import stopped.`),
      { statusCode: 400 }
    );
  }

  let replacedCount = 0;
  const insertedRows = [];

  for (const row of rowsToReplace) {
    await replaceExistingStudent(row.existing_student.id, row);
    replacedCount += 1;
  }

  if (selectedForInsert.length > 0) {
    const counters = await getLatestGenderCounters();
    const previewRows = toPreview(selectedForInsert, counters);
    const payloads = buildImportPayload(previewRows);
    const inserted = await createStudentsBulk(payloads, { allowMissingDob: true });
    insertedRows.push(...inserted);
  }

  return {
    imported_count: insertedRows.length,
    replaced_count: replacedCount,
    skipped_count: skippedCount,
    parser_report: parsed.parserReport,
    imported_students: insertedRows
  };
}
