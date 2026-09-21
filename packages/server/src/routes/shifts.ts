import { type RequestHandler, Router } from "express";
import {
	autoOpenShift,
	closeShift,
	getMissedData,
	listShifts,
	startShift,
	updateFloat,
} from "../controllers/shiftsController.js";
import { requireAuth } from "../middleware/auth.js";
import { validateBody, validateQuery } from "../middleware/validate.js";
import {
	AutoOpenShiftSchema,
	CloseShiftSchema,
	DateRangeQuerySchema,
	StartShiftSchema,
	UpdateFloatSchema,
} from "../schemas/index.js";

const router = Router();

router.get(
	"/",
	requireAuth as RequestHandler,
	validateQuery(DateRangeQuerySchema) as RequestHandler,
	listShifts as RequestHandler,
);
router.post(
	"/",
	requireAuth as RequestHandler,
	validateBody(StartShiftSchema) as RequestHandler,
	startShift as RequestHandler,
);

router.post(
	"/:id/close",
	requireAuth as RequestHandler,
	validateBody(CloseShiftSchema) as RequestHandler,
	closeShift as RequestHandler,
);

router.put(
	"/:id/float",
	requireAuth as RequestHandler,
	validateBody(UpdateFloatSchema) as RequestHandler,
	updateFloat as RequestHandler,
);

router.get(
	"/missed",
	requireAuth as RequestHandler,
	getMissedData as RequestHandler,
);

// ACP-011: dedicated auto-open endpoint — replaces the side-effect that was in getMissedData.
router.post(
	"/auto-open",
	requireAuth as RequestHandler,
	validateBody(AutoOpenShiftSchema) as RequestHandler,
	autoOpenShift as RequestHandler,
);

export default router;
