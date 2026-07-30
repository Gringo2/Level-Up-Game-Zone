import { type RequestHandler, Router } from "express";
import { createUser, updateRole } from "../controllers/usersController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.post("/", requireAuth as RequestHandler, createUser as RequestHandler);
router.put(
	"/:id/role",
	requireAuth as RequestHandler,
	updateRole as RequestHandler,
);

export default router;
