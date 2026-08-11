import { type RequestHandler, Router } from "express";
import {
	createSale,
	deleteSale,
	listSales,
	updateSale,
} from "../controllers/salesController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/", requireAuth as RequestHandler, listSales as RequestHandler);
router.post("/", requireAuth as RequestHandler, createSale as RequestHandler);
router.put("/:id", requireAuth as RequestHandler, updateSale as RequestHandler);
router.delete(
	"/:id",
	requireAuth as RequestHandler,
	deleteSale as RequestHandler,
);

export default router;
