import { type RequestHandler, Router } from "express";
import {
	createUser,
	getMe,
	listUsers,
	updateRole,
	inviteUser,
} from "../controllers/usersController.js";
import { requireAuth } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { CreateUserSchema, UpdateRoleSchema, InviteUserSchema } from "../schemas/index.js";

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

export default router;
