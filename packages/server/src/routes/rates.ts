import { type RequestHandler, Router } from "express";
import {
	createRate,
	listRates,
	updateRate,
} from "../controllers/gameRatesController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/", requireAuth as RequestHandler, listRates as RequestHandler);
router.post("/", requireAuth as RequestHandler, createRate as RequestHandler);
router.put("/:id", requireAuth as RequestHandler, updateRate as RequestHandler);

export default router;
