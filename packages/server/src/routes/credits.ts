import { ROLES } from "@level-up/shared";
import { type RequestHandler, Router } from "express";
import {
	createCredit,
	deleteCredit,
	listCredits,
	updateCredit,
} from "../controllers/creditsController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validateBody, validateQuery } from "../middleware/validate.js";
import {
	CreateCreditSchema,
	CreditsQuerySchema,
	DateRangeQuerySchema,
	DeleteReasonSchema,
	UpdateCreditSchema,
} from "../schemas/index.js";

const router = Router();

router.get(
	"/",
	requireAuth as RequestHandler,
	validateQuery(CreditsQuerySchema) as RequestHandler,
	listCredits as RequestHandler,
);
router.post(
	"/",
	requireAuth as RequestHandler,
	validateBody(CreateCreditSchema) as RequestHandler,
	createCredit as RequestHandler,
);
router.put(
	"/:id",
	requireAuth as RequestHandler,
	requireRole([ROLES.MANAGER, ROLES.ADMIN]) as RequestHandler,
	validateBody(UpdateCreditSchema) as RequestHandler,
	updateCredit as RequestHandler,
);
router.delete(
	"/:id",
	requireAuth as RequestHandler,
	requireRole([ROLES.MANAGER, ROLES.ADMIN]) as RequestHandler,
	validateBody(DeleteReasonSchema) as RequestHandler,
	deleteCredit as RequestHandler,
);

export default router;
