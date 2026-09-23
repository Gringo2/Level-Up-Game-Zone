import { COLLECTIONS, ROLES } from "@level-up/shared";
import type { Response } from "express";
import { db } from "../firebase.js";
import type { AuthRequest } from "../middleware/auth.js";
import { resolvePagination, sendList } from "../utils/list.js";
import { logger } from "../utils/logger.js";
import { safeErrorMessage } from "../utils/safeError.js";

export const listSportsBettingLogs = async (
	req: AuthRequest,
	res: Response,
) => {
	try {
		const { startDate, endDate } = req.query as {
			startDate?: string;
			endDate?: string;
		};

		let query: FirebaseFirestore.Query = db.collection(
			COLLECTIONS.SPORTS_BETTING_LOGS,
		);

		if (startDate) {
			query = query.where("date", ">=", startDate);
		}
		if (endDate) {
			query = query.where("date", "<=", endDate);
		}

		const pagination = resolvePagination(req.query);
		let ordered = query.orderBy("date", "desc");
		if (pagination.limit !== undefined) {
			if (pagination.cursor) {
				const cursorDoc = await db
					.collection(COLLECTIONS.SPORTS_BETTING_LOGS)
					.doc(pagination.cursor)
					.get();
				if (cursorDoc.exists) {
					ordered = ordered.startAfter(cursorDoc);
				}
			}
			ordered = ordered.limit(pagination.limit);
		}
		const snapshot = await ordered.get();
		return sendList(res, snapshot, pagination);
	} catch (error: unknown) {
		logger.error({ err: error }, "Error listing sports betting logs");
		return res.status(500).json({ error: safeErrorMessage(error) });
	}
};

export const createSportsBetting = async (req: AuthRequest, res: Response) => {
	const user = req.user;
	const { net_profit, date } = req.body;

	try {
		const userDoc = await db.collection(COLLECTIONS.USERS).doc(user.uid).get();
		const role = userDoc.exists ? userDoc.data()?.role : ROLES.STAFF;
		const displayName = userDoc.exists
			? userDoc.data()?.displayName
			: undefined;

		const newDocRef = db.collection(COLLECTIONS.SPORTS_BETTING_LOGS).doc();
		const auditRef = db.collection(COLLECTIONS.AUDIT_LOGS).doc();

		const data = {
			net_profit: parseFloat(net_profit),
			user_id: user.uid,
			...(displayName && { user_name: displayName }),
			date: date ? new Date(date).toISOString() : new Date().toISOString(),
			verified: role === ROLES.MANAGER || role === ROLES.ADMIN,
		};

		await db.runTransaction(
			async (transaction: FirebaseFirestore.Transaction) => {
				transaction.set(newDocRef, data);
				transaction.set(auditRef, {
					action: "CREATE",
					table_affected: "sports_betting_logs",
					record_id: newDocRef.id,
					old_value: null,
					new_value: data,
					reason_for_change: "Created",
					user_id: user.uid,
					timestamp: new Date().toISOString(),
				});
			},
		);

		return res.status(201).json({ id: newDocRef.id, ...data });
	} catch (error) {
		logger.error({ err: error }, "Error creating sports betting log");
		return res.status(500).json({ error: "Internal server error" });
	}
};

export const updateSportsBetting = async (req: AuthRequest, res: Response) => {
	const user = req.user;
	const { id } = req.params;
	const { net_profit, editReason } = req.body;

	try {
		const docRef = db.collection(COLLECTIONS.SPORTS_BETTING_LOGS).doc(id);
		const auditRef = db.collection(COLLECTIONS.AUDIT_LOGS).doc();

		await db.runTransaction(
			async (transaction: FirebaseFirestore.Transaction) => {
				const docSnap = await transaction.get(docRef);
				if (!docSnap.exists) {
					throw new Error("Sports betting log not found");
				}

				const oldDoc = { id: docSnap.id, ...docSnap.data() };

				// biome-ignore lint/suspicious/noExplicitAny: Firestore update payload
				const newValues: Record<string, any> = {};
				if (net_profit !== undefined)
					newValues.net_profit = parseFloat(net_profit);

				transaction.update(docRef, newValues);

				const newValueForAudit: Record<string, unknown> = { ...oldDoc };
				if (net_profit !== undefined) {
					newValueForAudit.net_profit = parseFloat(net_profit);
				}

				transaction.set(auditRef, {
					action: "UPDATE",
					table_affected: "sports_betting_logs",
					record_id: id,
					old_value: oldDoc,
					new_value: newValueForAudit,
					reason_for_change: editReason,
					user_id: user.uid,
					timestamp: new Date().toISOString(),
				});
			},
		);

		const updatedDoc = await db
			.collection(COLLECTIONS.SPORTS_BETTING_LOGS)
			.doc(id)
			.get();
		return res.status(200).json({ id: updatedDoc.id, ...updatedDoc.data() });
	} catch (error: unknown) {
		logger.error({ err: error }, "Error updating sports betting log");
		return res.status(500).json({ error: safeErrorMessage(error) });
	}
};

export const deleteSportsBetting = async (req: AuthRequest, res: Response) => {
	const user = req.user;
	const { id } = req.params;
	const { deleteReason } = req.body;

	try {
		const docRef = db.collection(COLLECTIONS.SPORTS_BETTING_LOGS).doc(id);
		const auditRef = db.collection(COLLECTIONS.AUDIT_LOGS).doc();

		await db.runTransaction(
			async (transaction: FirebaseFirestore.Transaction) => {
				const docSnap = await transaction.get(docRef);
				if (!docSnap.exists) {
					throw new Error("Sports betting log not found");
				}

				const oldDoc = { id: docSnap.id, ...docSnap.data() };

				transaction.delete(docRef);

				transaction.set(auditRef, {
					action: "DELETE",
					table_affected: "sports_betting_logs",
					record_id: id,
					old_value: oldDoc,
					new_value: null,
					reason_for_change: deleteReason,
					user_id: user.uid,
					timestamp: new Date().toISOString(),
				});
			},
		);

		return res.status(200).json({ message: "Deleted successfully" });
	} catch (error: unknown) {
		logger.error({ err: error }, "Error deleting sports betting log");
		return res.status(500).json({ error: safeErrorMessage(error) });
	}
};

export const verifySportsBetting = async (req: AuthRequest, res: Response) => {
	const user = req.user;
	const { id } = req.params;

	try {
		const docRef = db.collection(COLLECTIONS.SPORTS_BETTING_LOGS).doc(id);
		const auditRef = db.collection(COLLECTIONS.AUDIT_LOGS).doc();

		await db.runTransaction(
			async (transaction: FirebaseFirestore.Transaction) => {
				const docSnap = await transaction.get(docRef);
				if (!docSnap.exists) {
					throw new Error("Sports betting log not found");
				}

				const oldDoc = { id: docSnap.id, ...docSnap.data() };

				transaction.update(docRef, { verified: true });

				transaction.set(auditRef, {
					action: "UPDATE",
					table_affected: "sports_betting_logs",
					record_id: id,
					old_value: oldDoc,
					new_value: { ...oldDoc, verified: true },
					reason_for_change: "Verified log",
					user_id: user.uid,
					timestamp: new Date().toISOString(),
				});
			},
		);

		return res.status(200).json({ message: "Verified successfully" });
	} catch (error: unknown) {
		logger.error({ err: error }, "Error verifying sports betting log");
		return res.status(500).json({ error: safeErrorMessage(error) });
	}
};
