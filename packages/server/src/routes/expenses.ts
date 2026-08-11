import { type RequestHandler, Router } from "express";
import {
	createExpense,
	deleteExpense,
	listExpenses,
	updateExpense,
	verifyExpense,
} from "../controllers/expensesController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/", requireAuth as RequestHandler, listExpenses as RequestHandler);
router.post(
	"/",
	requireAuth as RequestHandler,
	createExpense as RequestHandler,
);
router.put(
	"/:id",
	requireAuth as RequestHandler,
	updateExpense as RequestHandler,
);
router.delete(
	"/:id",
	requireAuth as RequestHandler,
	deleteExpense as RequestHandler,
);
router.put(
	"/:id/verify",
	requireAuth as RequestHandler,
	verifyExpense as RequestHandler,
);

export default router;
