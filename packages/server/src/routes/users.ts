import { type RequestHandler, Router } from "express";
import {
	createUser,
	listUsers,
	updateRole,
} from "../controllers/usersController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/", requireAuth as RequestHandler, listUsers as RequestHandler);
router.post("/", requireAuth as RequestHandler, createUser as RequestHandler);
router.put(
	"/:id/role",
	requireAuth as RequestHandler,
	updateRole as RequestHandler,
);

export default router;
