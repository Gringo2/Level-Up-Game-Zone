import { ROLES } from "@level-up/shared";
import { type RequestHandler, Router } from "express";
import { listAuditLogs } from "../controllers/auditLogsController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

router.get(
	"/",
	requireAuth as RequestHandler,
	requireRole([ROLES.ADMIN]) as RequestHandler,
	listAuditLogs as RequestHandler,
);

export default router;
