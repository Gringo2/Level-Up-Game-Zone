import { type RequestHandler, Router } from "express";
import {
	createExpense,
	deleteExpense,
	listExpenses,
	updateExpense,
	verifyExpense,
} from "../controllers/expensesController.js";
import { requireAuth } from "../middleware/auth.js";
import { validateBody, validateQuery } from "../middleware/validate.js";
import {
	CreateExpenseSchema,
	DeleteReasonSchema,
	ListExpensesQuerySchema,
	UpdateExpenseSchema,
} from "../schemas/index.js";

const router = Router();

router.get(
	"/",
	requireAuth as RequestHandler,
	validateQuery(ListExpensesQuerySchema) as RequestHandler,
	listExpenses as RequestHandler,
);
router.post(
	"/",
	requireAuth as RequestHandler,
	validateBody(CreateExpenseSchema) as RequestHandler,
	createExpense as RequestHandler,
);
router.put(
	"/:id",
	requireAuth as RequestHandler,
	validateBody(UpdateExpenseSchema) as RequestHandler,
	updateExpense as RequestHandler,
);
router.delete(
	"/:id",
	requireAuth as RequestHandler,
	validateBody(DeleteReasonSchema) as RequestHandler,
	deleteExpense as RequestHandler,
);
router.put(
	"/:id/verify",
	requireAuth as RequestHandler,
	verifyExpense as RequestHandler,
);

export default router;
