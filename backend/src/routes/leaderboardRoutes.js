import { Router } from "express";
import {
  addManualEventHandler,
  deleteManualEventsHandler,
  eventPointsBreakdownHandler,
  houseChampionHandler,
  leaderboardHandler,
  loadOfficialSheetPointsHandler,
  saveManualEventPointsHandler
} from "../controllers/leaderboardController.js";

const router = Router();

router.get("/", leaderboardHandler);
router.get("/champion", houseChampionHandler);
router.get("/event-breakdown", eventPointsBreakdownHandler);
router.post("/event-breakdown/add-event", addManualEventHandler);
router.delete("/event-breakdown", deleteManualEventsHandler);
router.post("/event-breakdown/save", saveManualEventPointsHandler);
router.post("/load-official-sheet", loadOfficialSheetPointsHandler);

export default router;
