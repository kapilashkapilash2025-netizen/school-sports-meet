import { db, query } from "../config/db.js";
import { StudentModel } from "../models/studentModel.js";
import { calculateAge, resolveAgeCategory } from "../utils/scoring.js";

const allowedHouseCodes = ["VALUVAR", "BARATHI", "VIPULANTHAR", "NAVALAR"];
const requiredFields = ["name", "gender", "division", "house"];

function normalizeNameForMatch(name) {
  return String(name || "").trim().replace(/\s+/g, " ").toLowerCase();
}

function normalizeDateInput(rawValue) {
  const raw = String(rawValue || "").trim();
  if (!raw) return null;

  const normalized = raw.replace(/\./g, "-").replace(/\//g, "-");
  const fullMatch = normalized.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (fullMatch) {
    const [, y, m, d] = fullMatch;
    return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }

  const yearOnlyMatch = normalized.match(/^(\d{4})$/);
  if (yearOnlyMatch) {
    return `${yearOnlyMatch[1]}-01-01`;
  }

  return null;
}

function assertRequiredStudentFields(payload, options = {}) {
  const { allowMissingDob = false } = options;
  const missing = requiredFields.filter((key) => !String(payload[key] ?? "").trim());

  const hasDobInput = String(payload.date_of_birth ?? "").trim().length > 0;
  const hasBirthYear = String(payload.birth_year ?? "").trim().length > 0;

  if (!allowMissingDob && !hasDobInput && !hasBirthYear) {
    missing.push("date_of_birth");
  }

  const hasGrade = String(payload.grade ?? "").trim().length > 0;
  const hasDob = hasDobInput || hasBirthYear;
  if (!hasGrade && !hasDob) {
    missing.push("grade or date_of_birth or birth_year");
  }

  if (missing.length > 0) {
    throw Object.assign(new Error(`Missing required student data: ${missing.join(", ")}`), {
      statusCode: 400
    });
  }
}

function assertStudentIdNotProvided(payload) {
  if (payload.student_id !== undefined && String(payload.student_id).trim() !== "") {
    throw Object.assign(new Error("Student ID cannot be manually edited by users"), {
      statusCode: 400
    });
  }
}

function resolveGrade(payload) {
  const explicit = String(payload.grade || "").trim();
  if (explicit) return explicit;

  const birthYearRaw = String(payload.birth_year || "").trim();
  const dob = String(payload.date_of_birth || "").trim();
  const parsedDob = normalizeDateInput(dob);
  const birthYear = birthYearRaw ? Number(birthYearRaw) : Number((parsedDob || "").slice(0, 4));
  if (!Number.isFinite(birthYear) || birthYear <= 0) return "";

  const currentYear = new Date().getFullYear();
  const gradeNo = currentYear - birthYear - 5;

  if (gradeNo < 1) return "1";
  if (gradeNo > 13) return "13";
  return String(gradeNo);
}

function resolveGenderSuffix(gender) {
  const normalized = String(gender || "").toLowerCase();
  if (normalized === "male") return "B";
  if (normalized === "female") return "G";
  throw Object.assign(new Error("Invalid gender for student ID generation"), { statusCode: 400 });
}

async function assertStudentNotDuplicateByNameDob(payload, executor = query, excludeId = null) {
  const dateOfBirth = normalizeDateInput(payload.date_of_birth) || normalizeDateInput(payload.birth_year);
  const params = [normalizeNameForMatch(payload.name), dateOfBirth];
  let sql = `
    SELECT id
    FROM students
    WHERE LOWER(TRIM(name)) = $1
      AND (
        (date_of_birth = $2)
        OR (date_of_birth IS NULL AND $2 IS NULL)
      )
  `;

  if (excludeId !== null) {
    params.push(excludeId);
    sql += " AND id <> $3";
  }

  sql += " LIMIT 1";

  const existing = await executor(sql, params);
  if (existing.rows[0]) {
    throw Object.assign(new Error("This student already exists in the system."), { statusCode: 409 });
  }
}

async function resolveHouseIdFromCode(houseCode, executor = query) {
  const normalized = String(houseCode || "").toUpperCase();
  if (!allowedHouseCodes.includes(normalized)) {
    throw Object.assign(new Error("Invalid house assignment"), { statusCode: 400 });
  }

  const result = await executor("SELECT id FROM houses WHERE code = $1", [normalized]);
  if (!result.rows[0]) {
    throw Object.assign(new Error("House not found"), { statusCode: 400 });
  }

  return result.rows[0].id;
}

async function generateStudentId(client, gender) {
  const suffix = resolveGenderSuffix(gender);
  const lockKey = suffix === "B" ? 11001 : 11002;

  await client.query("SELECT pg_advisory_xact_lock($1)", [lockKey]);

  const latestResult = await client.query(
    `
      SELECT student_id
      FROM students
      WHERE RIGHT(student_id, 1) = $1
        AND student_id ~ '^S[0-9]{4}[BG]$'
      ORDER BY CAST(SUBSTRING(student_id FROM 2 FOR 4) AS INTEGER) DESC
      LIMIT 1
    `,
    [suffix]
  );

  const latestId = latestResult.rows[0]?.student_id;
  const latestNumber = latestId ? Number(latestId.slice(1, 5)) : 0;
  const nextNumber = latestNumber + 1;

  if (nextNumber > 9999) {
    throw Object.assign(new Error("Student ID limit reached for this gender group"), {
      statusCode: 400
    });
  }

  return `S${String(nextNumber).padStart(4, "0")}${suffix}`;
}

async function insertStudentWithClient(client, payload, options = {}) {
  const { allowMissingDob = false } = options;

  assertRequiredStudentFields(payload, { allowMissingDob });
  assertStudentIdNotProvided(payload);
  await assertStudentNotDuplicateByNameDob(payload, (text, params) => client.query(text, params));

  const houseId = await resolveHouseIdFromCode(payload.house, (text, params) =>
    client.query(text, params)
  );
  const studentId = await generateStudentId(client, payload.gender);
  const grade = resolveGrade(payload);
  const dateOfBirth = normalizeDateInput(payload.date_of_birth) || normalizeDateInput(payload.birth_year);
  const studentNumber = String(payload.student_number || "").trim() || `AUTO-ST-${studentId}`;
  const birthCertificateNumber =
    String(payload.birth_certificate_number || "").trim() || `AUTO-BC-${studentId}`;

  const result = await client.query(
    `
      INSERT INTO students (
        student_id, name, date_of_birth, gender, student_number,
        birth_certificate_number, nic_number, grade, division, house_id
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      RETURNING *
    `,
    [
      studentId,
      payload.name,
      dateOfBirth,
      payload.gender,
      studentNumber,
      birthCertificateNumber,
      payload.nic_number || null,
      grade,
      payload.division,
      houseId
    ]
  );

  return result.rows[0];
}

function mapPgConflict(error) {
  if (error.code === "23505") {
    if (String(error.constraint || "").includes("student_id")) {
      return Object.assign(new Error("Student ID generation conflict. Regenerate ID."), {
        statusCode: 409
      });
    }
    return Object.assign(new Error("Duplicate student record"), { statusCode: 409 });
  }

  return error;
}

export async function createStudent(payload) {
  const client = await db.connect();

  try {
    await client.query("BEGIN");
    const student = await insertStudentWithClient(client, payload, { allowMissingDob: true });
    await client.query("COMMIT");
    return student;
  } catch (error) {
    await client.query("ROLLBACK");
    throw mapPgConflict(error);
  } finally {
    client.release();
  }
}

export async function createStudentsBulk(payloads, options = {}) {
  const { allowMissingDob = false } = options;
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const inserted = [];
    for (const payload of payloads) {
      const row = await insertStudentWithClient(client, payload, { allowMissingDob });
      inserted.push(row);
    }

    await client.query("COMMIT");
    return inserted;
  } catch (error) {
    await client.query("ROLLBACK");
    throw mapPgConflict(error);
  } finally {
    client.release();
  }
}

export async function updateStudent(id, payload) {
  assertRequiredStudentFields(payload, { allowMissingDob: false });
  assertStudentIdNotProvided(payload);
  await assertStudentNotDuplicateByNameDob(payload, query, id);

  const houseId = await resolveHouseIdFromCode(payload.house);
  const grade = resolveGrade(payload);
  const dateOfBirth = normalizeDateInput(payload.date_of_birth) || normalizeDateInput(payload.birth_year);
  const sql = `
    UPDATE students
    SET name = $1,
        date_of_birth = $2,
        gender = $3,
        student_number = $4,
        birth_certificate_number = $5,
        nic_number = $6,
        grade = $7,
        division = $8,
        house_id = $9,
        updated_at = NOW()
    WHERE id = $10
    RETURNING *
  `;

  const result = await query(sql, [
    payload.name,
    dateOfBirth,
    payload.gender,
    payload.student_number,
    payload.birth_certificate_number,
    payload.nic_number || null,
    grade,
    payload.division,
    houseId,
    id
  ]);

  if (!result.rows[0]) {
    throw Object.assign(new Error("Student not found"), { statusCode: 404 });
  }

  return result.rows[0];
}

export async function deleteStudent(id) {
  const result = await query("DELETE FROM students WHERE id = $1 RETURNING id", [id]);
  if (!result.rows[0]) {
    throw Object.assign(new Error("Student not found"), { statusCode: 404 });
  }
}

export async function listStudents(search) {
  if (!search) {
    const result = await query(`${StudentModel.baseSelect} ORDER BY s.name LIMIT 200`);
    return result.rows;
  }

  const q = `%${search}%`;
  const result = await query(
    `${StudentModel.baseSelect}
     WHERE s.student_id ILIKE $1 OR s.name ILIKE $1
     ORDER BY s.name
     LIMIT 50`,
    [q]
  );
  return result.rows;
}

export async function getStudentDetection(studentId) {
  const result = await query(`${StudentModel.baseSelect} WHERE s.student_id = $1 LIMIT 1`, [studentId]);

  const student = result.rows[0];
  if (!student) {
    throw Object.assign(new Error("Student not found"), { statusCode: 404 });
  }

  if (!student.date_of_birth) {
    return {
      student,
      detectedGender: student.gender,
      age: null,
      ageCategory: null
    };
  }

  const age = calculateAge(student.date_of_birth);
  const ageCategory = resolveAgeCategory(age);

  return {
    student,
    detectedGender: student.gender,
    age,
    ageCategory
  };
}

export async function getStudentProfile(studentDbId) {
  const studentResult = await query(`${StudentModel.baseSelect} WHERE s.id = $1 LIMIT 1`, [studentDbId]);

  const student = studentResult.rows[0];
  if (!student) {
    throw Object.assign(new Error("Student not found"), { statusCode: 404 });
  }

  const historyResult = await query(
    `
      SELECT
        e.id AS event_id,
        e.name AS event_name,
        e.event_type AS category,
        e.gender_category AS gender,
        e.age_category AS age_group,
        er.score_value AS result,
        er.position,
        er.points_awarded AS points,
        er.outcome,
        ep.date_added
      FROM event_participants ep
      JOIN events e ON e.id = ep.event_id
      LEFT JOIN event_results er
        ON er.event_id = ep.event_id
       AND er.student_id = ep.student_id
      WHERE ep.student_id = $1
      ORDER BY ep.date_added DESC
    `,
    [studentDbId]
  );

  return {
    student,
    joinedEvents: historyResult.rows
  };
}

export async function assertStudentsExist(studentIds) {
  if (!studentIds.length) {
    return;
  }

  const result = await query("SELECT id FROM students WHERE id = ANY($1::int[])", [studentIds]);

  if (result.rows.length !== studentIds.length) {
    throw Object.assign(new Error("Some students are invalid for this event"), {
      statusCode: 400
    });
  }
}

export async function listHouseMembers(houseCode) {
  const normalized = String(houseCode || "").toUpperCase();
  const result = await query(
    `${StudentModel.baseSelect}
     WHERE h.code = $1
     ORDER BY s.name`,
    [normalized]
  );
  return result.rows;
}
