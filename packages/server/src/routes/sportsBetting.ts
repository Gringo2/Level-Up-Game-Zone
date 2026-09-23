import { ROLES } from "@level-up/shared";
import { type RequestHandler, Router } from "express";
import {
	createSportsBetting,
	deleteSportsBetting,
	listSportsBettingLogs,
	updateSportsBetting,
	verifySportsBetting,
} from "../controllers/sportsBettingController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validateBody, validateQuery } from "../middleware/validate.js";
import {
	CreateSportsBettingSchema,
	DateRangeQuerySchema,
	DeleteReasonSchema,
	UpdateSportsBettingSchema,
} from "../schemas/index.js";

const router = Router();

router.get(
	"/",
	requireAuth as RequestHandler,
	validateQuery(DateRangeQuerySchema) as RequestHandler,
	listSportsBettingLogs as RequestHandler,
);
router.post(
	"/",
	requireAuth as RequestHandler,
	requireRole([ROLES.MANAGER, ROLES.ADMIN]) as RequestHandler,
	validateBody(CreateSportsBettingSchema) as RequestHandler,
	createSportsBetting as RequestHandler,
);
router.put(
	"/:id",
	requireAuth as RequestHandler,
	requireRole([ROLES.MANAGER, ROLES.ADMIN]) as RequestHandler,
	validateBody(UpdateSportsBettingSchema) as RequestHandler,
	updateSportsBetting as RequestHandler,
);
router.delete(
	"/:id",
	requireAuth as RequestHandler,
	requireRole([ROLES.MANAGER, ROLES.ADMIN]) as RequestHandler,
	validateBody(DeleteReasonSchema) as RequestHandler,
	deleteSportsBetting as RequestHandler,
);
router.put(
	"/:id/verify",
	requireAuth as RequestHandler,
	requireRole([ROLES.MANAGER, ROLES.ADMIN]) as RequestHandler,
	verifySportsBetting as RequestHandler,
);

export default router;
