import {
  createStudent,
  deleteStudent,
  getStudentDetection,
  getStudentProfile,
  listHouseMembers,
  listStudents,
  updateStudent
} from "../services/studentService.js";
import {
  commitStudentImport,
  previewStudentImport
} from "../services/studentImportService.js";

export async function createStudentHandler(req, res, next) {
  try {
    const student = await createStudent(req.body);
    res.status(201).json(student);
  } catch (error) {
    next(error);
  }
}

export async function updateStudentHandler(req, res, next) {
  try {
    const student = await updateStudent(Number(req.params.id), req.body);
    res.json(student);
  } catch (error) {
    next(error);
  }
}

export async function deleteStudentHandler(req, res, next) {
  try {
    await deleteStudent(Number(req.params.id));
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function listStudentsHandler(req, res, next) {
  try {
    const students = await listStudents(req.query.search || "");
    res.json(students);
  } catch (error) {
    next(error);
  }
}

export async function detectStudentHandler(req, res, next) {
  try {
    const details = await getStudentDetection(req.params.studentId);
    res.json(details);
  } catch (error) {
    next(error);
  }
}

export async function studentProfileHandler(req, res, next) {
  try {
    const profile = await getStudentProfile(Number(req.params.id));
    res.json(profile);
  } catch (error) {
    next(error);
  }
}

export async function houseMembersHandler(req, res, next) {
  try {
    const rows = await listHouseMembers(req.params.houseCode);
    res.json(rows);
  } catch (error) {
    next(error);
  }
}

export async function studentImportPreviewHandler(req, res, next) {
  try {
    const preview = await previewStudentImport(req.files || []);
    res.json(preview);
  } catch (error) {
    next(error);
  }
}

export async function studentImportCommitHandler(req, res, next) {
  try {
    let decisions = {};

    if (req.body?.decisions) {
      try {
        decisions = JSON.parse(req.body.decisions);
      } catch {
        decisions = {};
      }
    }

    const result = await commitStudentImport(req.files || [], decisions);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

