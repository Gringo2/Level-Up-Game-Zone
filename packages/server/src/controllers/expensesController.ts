import { COLLECTIONS, ROLES } from "@level-up/shared";
import type { Response } from "express";
import { db } from "../firebase.js";
import type { AuthRequest } from "../middleware/auth.js";
import { resolvePagination, sendList } from "../utils/list.js";
import { logger } from "../utils/logger.js";
import { safeErrorMessage } from "../utils/safeError.js";

export const listExpenses = async (req: AuthRequest, res: Response) => {
	try {
		const { startDate, endDate } = req.query as {
			startDate?: string;
			endDate?: string;
		};

		let query: FirebaseFirestore.Query = db.collection(COLLECTIONS.EXPENSES);

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
					.collection(COLLECTIONS.EXPENSES)
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
		logger.error({ err: error }, "Error listing expenses");
		return res.status(500).json({ error: safeErrorMessage(error) });
	}
};

export const createExpense = async (req: AuthRequest, res: Response) => {
	const user = req.user;

	const {
		item_name,
		description,
		amount,
		category,
		date,
		quantity,
		unit_price,
		unit,
	} = req.body;

	try {
		const userDoc = await db.collection(COLLECTIONS.USERS).doc(user.uid).get();
		const role = userDoc.exists ? userDoc.data()?.role : ROLES.STAFF;
		const displayName = userDoc.exists
			? userDoc.data()?.displayName
			: undefined;

		const newDocRef = db.collection(COLLECTIONS.EXPENSES).doc();
		const auditRef = db.collection(COLLECTIONS.AUDIT_LOGS).doc();

		const computedAmount =
			quantity !== undefined && unit_price !== undefined
				? Math.round(quantity * unit_price * 100) / 100
				: parseFloat(amount);

		const data: Record<string, unknown> = {
			item_name,
			description,
			amount: computedAmount,
			category,
			user_id: user.uid,
			...(displayName && { user_name: displayName }),
			date: date ? new Date(date).toISOString() : new Date().toISOString(),
			verified: role === ROLES.MANAGER || role === ROLES.ADMIN,
		};

		if (quantity !== undefined) data.quantity = quantity;
		if (unit_price !== undefined) data.unit_price = unit_price;
		if (unit) data.unit = unit;

		await db.runTransaction(
			async (transaction: FirebaseFirestore.Transaction) => {
				transaction.set(newDocRef, data);
				transaction.set(auditRef, {
					action: "CREATE",
					table_affected: "expenses",
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
		logger.error({ err: error }, "Error creating expense");
		return res.status(500).json({ error: "Internal server error" });
	}
};

export const updateExpense = async (req: AuthRequest, res: Response) => {
	const user = req.user;

	const { id } = req.params;
	const {
		item_name,
		description,
		amount,
		category,
		editReason,
		quantity,
		unit_price,
		unit,
	} = req.body;

	try {
		const docRef = db.collection(COLLECTIONS.EXPENSES).doc(id);
		const auditRef = db.collection(COLLECTIONS.AUDIT_LOGS).doc();

		let updatedData: Record<string, unknown> = {};

		await db.runTransaction(
			async (transaction: FirebaseFirestore.Transaction) => {
				const docSnap = await transaction.get(docRef);
				if (!docSnap.exists) {
					throw new Error("Expense not found");
				}

				const oldDoc = { id: docSnap.id, ...docSnap.data() };

				// biome-ignore lint/suspicious/noExplicitAny: Firestore update payload
				const newValues: Record<string, any> = {};
				if (item_name !== undefined) newValues.item_name = item_name;
				if (description !== undefined) newValues.description = description;
				if (category !== undefined) newValues.category = category;
				if (quantity !== undefined) newValues.quantity = quantity;
				if (unit_price !== undefined) newValues.unit_price = unit_price;
				if (unit !== undefined) newValues.unit = unit;

				if (amount !== undefined) {
					newValues.amount = parseFloat(amount);
				} else if (quantity !== undefined && unit_price !== undefined) {
					newValues.amount = Math.round(quantity * unit_price * 100) / 100;
				}

				transaction.update(docRef, newValues);

				transaction.set(auditRef, {
					action: "UPDATE",
					table_affected: "expenses",
					record_id: id,
					old_value: oldDoc,
					new_value: newValues,
					reason_for_change: editReason,
					user_id: user.uid,
					timestamp: new Date().toISOString(),
				});

				updatedData = { id: docSnap.id, ...docSnap.data(), ...newValues };
			},
		);

		return res.status(200).json(updatedData);
	} catch (error: unknown) {
		logger.error({ err: error }, "Error updating expense");
		return res.status(500).json({ error: safeErrorMessage(error) });
	}
};

export const deleteExpense = async (req: AuthRequest, res: Response) => {
	const user = req.user;

	const { id } = req.params;
	const { deleteReason } = req.body;

	try {
		const docRef = db.collection(COLLECTIONS.EXPENSES).doc(id);
		const auditRef = db.collection(COLLECTIONS.AUDIT_LOGS).doc();

		await db.runTransaction(
			async (transaction: FirebaseFirestore.Transaction) => {
				const docSnap = await transaction.get(docRef);
				if (!docSnap.exists) {
					throw new Error("Expense not found");
				}

				const oldDoc = { id: docSnap.id, ...docSnap.data() };

				transaction.delete(docRef);

				transaction.set(auditRef, {
					action: "DELETE",
					table_affected: "expenses",
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
		logger.error({ err: error }, "Error deleting expense");
		return res.status(500).json({ error: safeErrorMessage(error) });
	}
};

export const verifyExpense = async (req: AuthRequest, res: Response) => {
	const user = req.user;

	const { id } = req.params;

	try {
		const docRef = db.collection(COLLECTIONS.EXPENSES).doc(id);
		const auditRef = db.collection(COLLECTIONS.AUDIT_LOGS).doc();

		await db.runTransaction(
			async (transaction: FirebaseFirestore.Transaction) => {
				const docSnap = await transaction.get(docRef);
				if (!docSnap.exists) {
					throw new Error("Expense not found");
				}

				const oldDoc = { id: docSnap.id, ...docSnap.data() };

				transaction.update(docRef, { verified: true });

				transaction.set(auditRef, {
					action: "UPDATE",
					table_affected: "expenses",
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
		logger.error({ err: error }, "Error verifying expense");
		return res.status(500).json({ error: safeErrorMessage(error) });
	}
};
