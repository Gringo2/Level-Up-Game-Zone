import { type RequestHandler, Router } from "express";
import {
	createSale,
	deleteSale,
	listSales,
	updateSale,
} from "../controllers/salesController.js";
import { requireAuth } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import {
	CreateSaleSchema,
	DeleteReasonSchema,
	UpdateSaleSchema,
} from "../schemas/index.js";

const router = Router();

router.get("/", requireAuth as RequestHandler, listSales as RequestHandler);
router.post(
	"/",
	requireAuth as RequestHandler,
	validateBody(CreateSaleSchema) as RequestHandler,
	createSale as RequestHandler,
);
router.put(
	"/:id",
	requireAuth as RequestHandler,
	validateBody(UpdateSaleSchema) as RequestHandler,
	updateSale as RequestHandler,
);
router.delete(
	"/:id",
	requireAuth as RequestHandler,
	validateBody(DeleteReasonSchema) as RequestHandler,
	deleteSale as RequestHandler,
);

export default router;
