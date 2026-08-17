import { COLLECTIONS } from "@level-up/shared";
import type { Response } from "express";
import { db } from "../firebase.js";
import type { AuthRequest } from "../middleware/auth.js";

export const listAuditLogs = async (_req: AuthRequest, res: Response) => {
	try {
		const snapshot = await db
			.collection(COLLECTIONS.AUDIT_LOGS)
			.orderBy("timestamp", "desc")
			.get();
		const rows = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
		return res.status(200).json(rows);
	} catch (error: unknown) {
		console.error("Error listing audit logs:", error);
		return res
			.status(500)
			.json({ error: (error as Error).message || "Internal server error" });
	}
};
