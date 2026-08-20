import { ROLES } from "@level-up/shared";
import { type RequestHandler, Router } from "express";
import {
	createEmployee,
	listEmployees,
	updateEmployee,
} from "../controllers/employeesController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import {
	CreateEmployeeSchema,
	UpdateEmployeeSchema,
} from "../schemas/index.js";

const router = Router();

router.get("/", requireAuth as RequestHandler, listEmployees as RequestHandler);
router.post(
	"/",
	requireAuth as RequestHandler,
	requireRole([ROLES.ADMIN]) as RequestHandler,
	validateBody(CreateEmployeeSchema) as RequestHandler,
	createEmployee as RequestHandler,
);
router.put(
	"/:id",
	requireAuth as RequestHandler,
	requireRole([ROLES.ADMIN]) as RequestHandler,
	validateBody(UpdateEmployeeSchema) as RequestHandler,
	updateEmployee as RequestHandler,
);

export default router;
