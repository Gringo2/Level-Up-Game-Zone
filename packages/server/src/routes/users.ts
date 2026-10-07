import { ROLES } from "@level-up/shared";
import { type RequestHandler, Router } from "express";
import {
	createUser,
	deleteUser,
	getMe,
	inviteUser,
	listUsers,
	updateRole,
} from "../controllers/usersController.js";
import { requireAuth, requireRole, requireToken } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import {
	CreateUserSchema,
	DeleteReasonSchema,
	InviteUserSchema,
	UpdateRoleSchema,
} from "../schemas/index.js";

const router = Router();

// M-132: self-registration routes are token-only; all others require membership.
router.get("/me", requireToken as RequestHandler, getMe as RequestHandler);
router.get(
	"/",
	requireAuth as RequestHandler,
	requireRole([ROLES.ADMIN]) as RequestHandler,
	listUsers as RequestHandler,
);
router.post(
	"/",
	requireToken as RequestHandler,
	validateBody(CreateUserSchema) as RequestHandler,
	createUser as RequestHandler,
);
router.put(
	"/:id/role",
	requireAuth as RequestHandler,
	requireRole([ROLES.ADMIN]) as RequestHandler,
	validateBody(UpdateRoleSchema) as RequestHandler,
	updateRole as RequestHandler,
);
router.post(
	"/invite",
	requireAuth as RequestHandler,
	requireRole([ROLES.ADMIN]) as RequestHandler,
	validateBody(InviteUserSchema) as RequestHandler,
	inviteUser as RequestHandler,
);
router.delete(
	"/:id",
	requireAuth as RequestHandler,
	requireRole([ROLES.ADMIN]) as RequestHandler,
	validateBody(DeleteReasonSchema) as RequestHandler,
	deleteUser as RequestHandler,
);

export default router;
