import { type RequestHandler, Router } from "express";
import { listAuditLogs } from "../controllers/auditLogsController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/", requireAuth as RequestHandler, listAuditLogs as RequestHandler);

export default router;
