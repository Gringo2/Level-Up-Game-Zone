import { COLLECTIONS, CREDIT_STATUSES } from "@level-up/shared";
import type { Response } from "express";
import { db } from "../firebase.js";
import type { AuthRequest } from "../middleware/auth.js";
import { resolvePagination, sendList } from "../utils/list.js";
import { logger } from "../utils/logger.js";
import { safeErrorMessage } from "../utils/safeError.js";

export const listCredits = async (req: AuthRequest, res: Response) => {
	try {
		const { startDate, endDate, employee_id } = req.query as {
			startDate?: string;
			endDate?: string;
			employee_id?: string;
		};

		let query: FirebaseFirestore.Query = db.collection(COLLECTIONS.CREDITS);

		if (startDate) {
			query = query.where("date", ">=", startDate);
		}
		if (endDate) {
			query = query.where("date", "<=", endDate);
		}
		if (employee_id) {
			query = query.where("employee_id", "==", employee_id);
		}

		const pagination = resolvePagination(req.query);
		let ordered = query.orderBy("date", "desc");
		if (pagination.limit !== undefined) {
			if (pagination.cursor) {
				const cursorDoc = await db
					.collection(COLLECTIONS.CREDITS)
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
		logger.error({ err: error }, "Error listing credits");
		return res.status(500).json({ error: safeErrorMessage(error) });
	}
};

export const createCredit = async (req: AuthRequest, res: Response) => {
	const user = req.user;

	const { employee_id, employee_name, amount, reason, date } = req.body;

	try {
		const userDoc = await db.collection(COLLECTIONS.USERS).doc(user.uid).get();
		const displayName = userDoc.exists
			? userDoc.data()?.displayName
			: undefined;

		const newDocRef = db.collection(COLLECTIONS.CREDITS).doc();
		const auditRef = db.collection(COLLECTIONS.AUDIT_LOGS).doc();

		const data = {
			employee_id,
			employee_name,
			amount: parseFloat(amount),
			reason,
			status: CREDIT_STATUSES.PENDING,
			user_id: user.uid,
			...(displayName && { user_name: displayName }),
			date: date ? new Date(date).toISOString() : new Date().toISOString(),
		};

		await db.runTransaction(
			async (transaction: FirebaseFirestore.Transaction) => {
				transaction.set(newDocRef, data);
				transaction.set(auditRef, {
					action: "CREATE",
					table_affected: "credits",
					record_id: newDocRef.id,
					old_value: null,
					new_value: data,
					reason_for_change: "Created credit",
					user_id: user.uid,
					timestamp: new Date().toISOString(),
				});
			},
		);

		return res.status(201).json({ id: newDocRef.id, ...data });
	} catch (error: unknown) {
		logger.error({ err: error }, "Error creating credit");
		return res.status(500).json({ error: safeErrorMessage(error) });
	}
};

export const updateCredit = async (req: AuthRequest, res: Response) => {
	const user = req.user;

	const { id } = req.params;
	const { employee_id, employee_name, amount, reason, status, editReason } =
		req.body;

	try {
		const docRef = db.collection(COLLECTIONS.CREDITS).doc(id);
		const auditRef = db.collection(COLLECTIONS.AUDIT_LOGS).doc();

		await db.runTransaction(
			async (transaction: FirebaseFirestore.Transaction) => {
				const docSnap = await transaction.get(docRef);
				if (!docSnap.exists) {
					throw new Error("Credit not found");
				}

				const oldDoc = { id: docSnap.id, ...docSnap.data() };

				// biome-ignore lint/suspicious/noExplicitAny: Firestore update payload
				const newValues: Record<string, any> = {};
				if (employee_id !== undefined) newValues.employee_id = employee_id;
				if (employee_name !== undefined)
					newValues.employee_name = employee_name;
				if (amount !== undefined) newValues.amount = parseFloat(amount);
				if (reason !== undefined) newValues.reason = reason;
				if (status !== undefined) {
					newValues.status = status;
					newValues.resolved_date = new Date().toISOString();
				}

				transaction.update(docRef, newValues);

				transaction.set(auditRef, {
					action: "UPDATE",
					table_affected: "credits",
					record_id: id,
					old_value: oldDoc,
					new_value: { ...oldDoc, ...newValues },
					reason_for_change: editReason,
					user_id: user.uid,
					timestamp: new Date().toISOString(),
				});
			},
		);

		const updatedDoc = await db.collection(COLLECTIONS.CREDITS).doc(id).get();
		return res.status(200).json({ id: updatedDoc.id, ...updatedDoc.data() });
	} catch (error: unknown) {
		logger.error({ err: error }, "Error updating credit");
		return res.status(500).json({ error: safeErrorMessage(error) });
	}
};

export const deleteCredit = async (req: AuthRequest, res: Response) => {
	const user = req.user;

	const { id } = req.params;
	const { deleteReason } = req.body;

	try {
		const docRef = db.collection(COLLECTIONS.CREDITS).doc(id);
		const auditRef = db.collection(COLLECTIONS.AUDIT_LOGS).doc();

		await db.runTransaction(
			async (transaction: FirebaseFirestore.Transaction) => {
				const docSnap = await transaction.get(docRef);
				if (!docSnap.exists) {
					throw new Error("Credit not found");
				}

				const oldDoc = { id: docSnap.id, ...docSnap.data() };

				transaction.delete(docRef);

				transaction.set(auditRef, {
					action: "DELETE",
					table_affected: "credits",
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
		logger.error({ err: error }, "Error deleting credit");
		return res.status(500).json({ error: safeErrorMessage(error) });
	}
};
