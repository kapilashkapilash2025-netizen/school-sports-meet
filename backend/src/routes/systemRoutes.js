import { Router } from "express";
import { adminUsersHandler, housesSummaryHandler } from "../controllers/systemController.js";

const router = Router();

router.get("/houses", housesSummaryHandler);
router.get("/admins", adminUsersHandler);

export default router;
