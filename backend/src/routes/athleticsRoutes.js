import { Router } from "express";
import {
  athleticsEventsHandler,
  athleticsResultsHandler,
  saveAthleticsResultHandler
} from "../controllers/athleticsController.js";

const router = Router();

router.get("/events", athleticsEventsHandler);
router.get("/results/:eventId", athleticsResultsHandler);
router.post("/results", saveAthleticsResultHandler);

export default router;
