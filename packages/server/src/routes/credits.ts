import { type RequestHandler, Router } from "express";
import {
	createCredit,
	deleteCredit,
	listCredits,
	updateCredit,
} from "../controllers/creditsController.js";
import { requireAuth } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import {
	CreateCreditSchema,
	DeleteReasonSchema,
	UpdateCreditSchema,
} from "../schemas/index.js";

const router = Router();

router.get("/", requireAuth as RequestHandler, listCredits as RequestHandler);
router.post(
	"/",
	requireAuth as RequestHandler,
	validateBody(CreateCreditSchema) as RequestHandler,
	createCredit as RequestHandler,
);
router.put(
	"/:id",
	requireAuth as RequestHandler,
	validateBody(UpdateCreditSchema) as RequestHandler,
	updateCredit as RequestHandler,
);
router.delete(
	"/:id",
	requireAuth as RequestHandler,
	validateBody(DeleteReasonSchema) as RequestHandler,
	deleteCredit as RequestHandler,
);

export default router;
