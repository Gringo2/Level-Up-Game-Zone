import { type RequestHandler, Router } from "express";
import {
	createRate,
	listRates,
	updateRate,
} from "../controllers/gameRatesController.js";
import { requireAuth } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import {
	CreateGameRateSchema,
	UpdateGameRateSchema,
} from "../schemas/index.js";

const router = Router();

router.get("/", requireAuth as RequestHandler, listRates as RequestHandler);
router.post(
	"/",
	requireAuth as RequestHandler,
	validateBody(CreateGameRateSchema) as RequestHandler,
	createRate as RequestHandler,
);
router.put(
	"/:id",
	requireAuth as RequestHandler,
	validateBody(UpdateGameRateSchema) as RequestHandler,
	updateRate as RequestHandler,
);

export default router;
