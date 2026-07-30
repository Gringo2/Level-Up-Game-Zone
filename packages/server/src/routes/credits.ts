import { type RequestHandler, Router } from "express";
import {
	createCredit,
	deleteCredit,
	updateCredit,
} from "../controllers/creditsController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.post("/", requireAuth as RequestHandler, createCredit as RequestHandler);
router.put(
	"/:id",
	requireAuth as RequestHandler,
	updateCredit as RequestHandler,
);
router.delete(
	"/:id",
	requireAuth as RequestHandler,
	deleteCredit as RequestHandler,
);

export default router;
