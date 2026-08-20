import { ROLES } from "@level-up/shared";
import { type RequestHandler, Router } from "express";
import {
	createExpense,
	deleteExpense,
	listExpenses,
	updateExpense,
	verifyExpense,
} from "../controllers/expensesController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validateBody, validateQuery } from "../middleware/validate.js";
import {
	CreateExpenseSchema,
	DateRangeQuerySchema,
	DeleteReasonSchema,
	UpdateExpenseSchema,
} from "../schemas/index.js";

const router = Router();

router.get(
	"/",
	requireAuth as RequestHandler,
	validateQuery(DateRangeQuerySchema) as RequestHandler,
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
	requireRole([ROLES.MANAGER, ROLES.ADMIN]) as RequestHandler,
	validateBody(UpdateExpenseSchema) as RequestHandler,
	updateExpense as RequestHandler,
);
router.delete(
	"/:id",
	requireAuth as RequestHandler,
	requireRole([ROLES.MANAGER, ROLES.ADMIN]) as RequestHandler,
	validateBody(DeleteReasonSchema) as RequestHandler,
	deleteExpense as RequestHandler,
);
router.put(
	"/:id/verify",
	requireAuth as RequestHandler,
	requireRole([ROLES.MANAGER, ROLES.ADMIN]) as RequestHandler,
	verifyExpense as RequestHandler,
);

export default router;
