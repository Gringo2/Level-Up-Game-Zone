import { type RequestHandler, Router } from "express";
import { closeShift, startShift } from "../controllers/shiftsController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.post("/", requireAuth as RequestHandler, startShift as RequestHandler);

router.post(
	"/:id/close",
	requireAuth as RequestHandler,
	closeShift as RequestHandler,
);

export default router;
