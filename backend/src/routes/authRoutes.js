import { Router } from "express";
import { login, logout, me } from "../controllers/authController.js";
import { authRequired } from "../middleware/authMiddleware.js";

const router = Router();

router.post("/login", login);
router.post("/logout", authRequired, logout);
router.get("/me", authRequired, me);

export default router;
