import { type RequestHandler, Router } from "express";
import {
	createExpenseCategory,
	deleteExpenseCategory,
	listExpenseCategories,
	updateExpenseCategory,
} from "../controllers/expenseCategoriesController.js";
import { requireAuth } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import {
	CreateExpenseCategorySchema,
	DeleteReasonSchema,
	UpdateExpenseCategorySchema,
} from "../schemas/index.js";

const router = Router();

router.get(
	"/",
	requireAuth as RequestHandler,
	listExpenseCategories as RequestHandler,
);
router.post(
	"/",
	requireAuth as RequestHandler,
	validateBody(CreateExpenseCategorySchema) as RequestHandler,
	createExpenseCategory as RequestHandler,
);
router.put(
	"/:id",
	requireAuth as RequestHandler,
	validateBody(UpdateExpenseCategorySchema) as RequestHandler,
	updateExpenseCategory as RequestHandler,
);
router.delete(
	"/:id",
	requireAuth as RequestHandler,
	validateBody(DeleteReasonSchema) as RequestHandler,
	deleteExpenseCategory as RequestHandler,
);

export default router;
