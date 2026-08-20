import { ROLES } from "@level-up/shared";
import { type RequestHandler, Router } from "express";
import {
	createSale,
	deleteSale,
	listSales,
	updateSale,
} from "../controllers/salesController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validateBody, validateQuery } from "../middleware/validate.js";
import {
	CreateSaleSchema,
	DateRangeQuerySchema,
	DeleteReasonSchema,
	UpdateSaleSchema,
} from "../schemas/index.js";

const router = Router();

router.get(
	"/",
	requireAuth as RequestHandler,
	validateQuery(DateRangeQuerySchema) as RequestHandler,
	listSales as RequestHandler,
);
router.post(
	"/",
	requireAuth as RequestHandler,
	validateBody(CreateSaleSchema) as RequestHandler,
	createSale as RequestHandler,
);
router.put(
	"/:id",
	requireAuth as RequestHandler,
	requireRole([ROLES.MANAGER, ROLES.ADMIN]) as RequestHandler,
	validateBody(UpdateSaleSchema) as RequestHandler,
	updateSale as RequestHandler,
);
router.delete(
	"/:id",
	requireAuth as RequestHandler,
	requireRole([ROLES.MANAGER, ROLES.ADMIN]) as RequestHandler,
	validateBody(DeleteReasonSchema) as RequestHandler,
	deleteSale as RequestHandler,
);

export default router;
