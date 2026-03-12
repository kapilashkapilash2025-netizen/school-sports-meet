import { Router } from "express";
import {
  eventResultsHandler,
  houseResultsHandler,
  resultSummaryHandler,
  studentResultsHandler,
  upsertResultsHandler
} from "../controllers/resultController.js";

const router = Router();

router.post("/", upsertResultsHandler);
router.get("/summary", resultSummaryHandler);
router.get("/event/:eventId", eventResultsHandler);
router.get("/student/:studentId", studentResultsHandler);
router.get("/house/:houseId", houseResultsHandler);

export default router;
