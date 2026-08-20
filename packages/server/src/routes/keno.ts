import { ROLES } from "@level-up/shared";
import { type RequestHandler, Router } from "express";
import {
	createKeno,
	deleteKeno,
	listKenoLogs,
	updateKeno,
	verifyKeno,
} from "../controllers/kenoController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validateBody, validateQuery } from "../middleware/validate.js";
import {
	CreateKenoSchema,
	DateRangeQuerySchema,
	DeleteReasonSchema,
	UpdateKenoSchema,
} from "../schemas/index.js";

const router = Router();

router.get(
	"/",
	requireAuth as RequestHandler,
	validateQuery(DateRangeQuerySchema) as RequestHandler,
	listKenoLogs as RequestHandler,
);
router.post(
	"/",
	requireAuth as RequestHandler,
	validateBody(CreateKenoSchema) as RequestHandler,
	createKeno as RequestHandler,
);
router.put(
	"/:id",
	requireAuth as RequestHandler,
	validateBody(UpdateKenoSchema) as RequestHandler,
	updateKeno as RequestHandler,
);
router.delete(
	"/:id",
	requireAuth as RequestHandler,
	validateBody(DeleteReasonSchema) as RequestHandler,
	deleteKeno as RequestHandler,
);
router.put(
	"/:id/verify",
	requireAuth as RequestHandler,
	requireRole([ROLES.MANAGER, ROLES.ADMIN]) as RequestHandler,
	verifyKeno as RequestHandler,
);

export default router;
