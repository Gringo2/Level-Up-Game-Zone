import { type RequestHandler, Router } from "express";
import {
	closeShift,
	getMissedData,
	listShifts,
	resolveMissedData,
	startShift,
	updateFloat,
} from "../controllers/shiftsController.js";
import { requireAuth } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import {
	CloseShiftSchema,
	ResolveMissedDaySchema,
	StartShiftSchema,
	UpdateFloatSchema,
} from "../schemas/index.js";

const router = Router();

router.get("/", requireAuth as RequestHandler, listShifts as RequestHandler);
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
router.post(
	"/resolve-missed",
	requireAuth as RequestHandler,
	validateBody(ResolveMissedDaySchema) as RequestHandler,
	resolveMissedData as RequestHandler,
);

export default router;
