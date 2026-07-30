import { type RequestHandler, Router } from "express";
import {
	createKeno,
	deleteKeno,
	updateKeno,
	verifyKeno,
} from "../controllers/kenoController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.post("/", requireAuth as RequestHandler, createKeno as RequestHandler);
router.put("/:id", requireAuth as RequestHandler, updateKeno as RequestHandler);
router.delete(
	"/:id",
	requireAuth as RequestHandler,
	deleteKeno as RequestHandler,
);
router.put(
	"/:id/verify",
	requireAuth as RequestHandler,
	verifyKeno as RequestHandler,
);

export default router;
