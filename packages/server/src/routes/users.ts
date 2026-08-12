import { type RequestHandler, Router } from "express";
import {
	createUser,
	deleteUser,
	getMe,
	inviteUser,
	listUsers,
	updateRole,
} from "../controllers/usersController.js";
import { requireAuth } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import {
	CreateUserSchema,
	InviteUserSchema,
	UpdateRoleSchema,
} from "../schemas/index.js";

const router = Router();

router.get("/me", requireAuth as RequestHandler, getMe as RequestHandler);
router.get("/", requireAuth as RequestHandler, listUsers as RequestHandler);
router.post(
	"/",
	requireAuth as RequestHandler,
	validateBody(CreateUserSchema) as RequestHandler,
	createUser as RequestHandler,
);
router.put(
	"/:id/role",
	requireAuth as RequestHandler,
	validateBody(UpdateRoleSchema) as RequestHandler,
	updateRole as RequestHandler,
);
router.post(
	"/invite",
	requireAuth as RequestHandler,
	validateBody(InviteUserSchema) as RequestHandler,
	inviteUser as RequestHandler,
);
router.delete(
	"/:id",
	requireAuth as RequestHandler,
	deleteUser as RequestHandler,
);

export default router;
