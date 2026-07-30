import { type RequestHandler, Router } from "express";
import {
	createSale,
	deleteSale,
	updateSale,
} from "../controllers/salesController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.post("/", requireAuth as RequestHandler, createSale as RequestHandler);
router.put("/:id", requireAuth as RequestHandler, updateSale as RequestHandler);
router.delete(
	"/:id",
	requireAuth as RequestHandler,
	deleteSale as RequestHandler,
);

export default router;
