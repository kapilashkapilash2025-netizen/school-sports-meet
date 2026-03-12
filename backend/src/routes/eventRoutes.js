import { Router } from "express";
import {
  addParticipantHandler,
  createEventHandler,
  listEventsHandler,
  listParticipantsHandler,
  loadOfficialEventsHandler,
  metricsHandler,
  removeParticipantHandler
} from "../controllers/eventController.js";

const router = Router();

router.get("/", listEventsHandler);
router.get("/metrics", metricsHandler);
router.get("/:id/participants", listParticipantsHandler);
router.post("/", createEventHandler);
router.post("/load-official-sheet", loadOfficialEventsHandler);
router.post("/:id/participants", addParticipantHandler);
router.delete("/:id/participants/:participantId", removeParticipantHandler);

export default router;
