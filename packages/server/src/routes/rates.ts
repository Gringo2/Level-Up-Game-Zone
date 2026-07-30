import { type RequestHandler, Router } from "express";
import { createRate, updateRate } from "../controllers/gameRatesController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.post("/", requireAuth as RequestHandler, createRate as RequestHandler);
router.put("/:id", requireAuth as RequestHandler, updateRate as RequestHandler);

export default router;
