import { type RequestHandler, Router } from "express";
import { closeShift } from "../controllers/shiftsController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.post(
	"/:id/close",
	requireAuth as RequestHandler,
	closeShift as RequestHandler,
);

export default router;
