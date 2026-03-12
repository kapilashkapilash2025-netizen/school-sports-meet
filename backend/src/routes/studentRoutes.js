import multer from "multer";
import { Router } from "express";
import {
  createStudentHandler,
  deleteStudentHandler,
  detectStudentHandler,
  houseMembersHandler,
  listStudentsHandler,
  studentImportCommitHandler,
  studentImportPreviewHandler,
  studentProfileHandler,
  updateStudentHandler
} from "../controllers/studentController.js";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

router.get("/", listStudentsHandler);
router.get("/detect/:studentId", detectStudentHandler);
router.get("/profile/:id", studentProfileHandler);
router.get("/house/:houseCode", houseMembersHandler);
router.post("/import/preview", upload.array("files", 20), studentImportPreviewHandler);
router.post("/import/commit", upload.array("files", 20), studentImportCommitHandler);
router.post("/", createStudentHandler);
router.put("/:id", updateStudentHandler);
router.delete("/:id", deleteStudentHandler);

export default router;

