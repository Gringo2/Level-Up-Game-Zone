import { COLLECTIONS } from "@level-up/shared";
import type { Response } from "express";
import { db } from "../firebase.js";
import type { AuthRequest } from "../middleware/auth.js";

export const listAuditLogs = async (req: AuthRequest, res: Response) => {
	try {
		const { limit = 50, cursor } = req.query;

		let query = db
			.collection(COLLECTIONS.AUDIT_LOGS)
			.orderBy("timestamp", "desc")
			.limit(Number(limit));

		if (cursor) {
			const cursorDoc = await db
				.collection(COLLECTIONS.AUDIT_LOGS)
				.doc(cursor as string)
				.get();
			if (cursorDoc.exists) {
				query = query.startAfter(cursorDoc);
			}
		}

		const snapshot = await query.get();
		const rows = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

		const nextCursor =
			snapshot.docs.length === Number(limit)
				? snapshot.docs[snapshot.docs.length - 1].id
				: null;

		return res.status(200).json({ data: rows, nextCursor });
	} catch (error: unknown) {
		console.error("Error listing audit logs:", error);
		return res
			.status(500)
			.json({ error: (error as Error).message || "Internal server error" });
	}
};
