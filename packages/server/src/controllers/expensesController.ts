import { COLLECTIONS, ROLES } from "@level-up/shared";
import type { Response } from "express";
import { db } from "../firebase.js";
import type { AuthRequest } from "../middleware/auth.js";

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

		const snapshot = await query.orderBy("date", "desc").get();
		const rows = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
		return res.status(200).json(rows);
	} catch (error: unknown) {
		console.error("Error listing expenses:", error);
		return res
			.status(500)
			.json({ error: (error as Error).message || "Internal server error" });
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

		await db.runTransaction(async (transaction) => {
			transaction.set(newDocRef, data);
			transaction.set(auditRef, {
				table_affected: "expenses",
				record_id: newDocRef.id,
				old_value: null,
				new_value: data,
				reason_for_change: "Created",
				user_id: user.uid,
				timestamp: new Date().toISOString(),
			});
		});

		return res.status(201).json({ id: newDocRef.id, ...data });
	} catch (error) {
		console.error("Error creating expense:", error);
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

		await db.runTransaction(async (transaction) => {
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
				table_affected: "expenses",
				record_id: id,
				old_value: oldDoc,
				new_value: newValues,
				reason_for_change: editReason,
				user_id: user.uid,
				timestamp: new Date().toISOString(),
			});

			updatedData = { id: docSnap.id, ...docSnap.data(), ...newValues };
		});

		return res.status(200).json(updatedData);
	} catch (error: unknown) {
		console.error("Error updating expense:", error);
		return res
			.status(500)
			.json({ error: (error as Error).message || "Internal server error" });
	}
};

export const deleteExpense = async (req: AuthRequest, res: Response) => {
	const user = req.user;

	const { id } = req.params;
	const { deleteReason } = req.body;

	try {
		const docRef = db.collection(COLLECTIONS.EXPENSES).doc(id);
		const auditRef = db.collection(COLLECTIONS.AUDIT_LOGS).doc();

		await db.runTransaction(async (transaction) => {
			const docSnap = await transaction.get(docRef);
			if (!docSnap.exists) {
				throw new Error("Expense not found");
			}

			const oldDoc = { id: docSnap.id, ...docSnap.data() };

			transaction.delete(docRef);

			transaction.set(auditRef, {
				table_affected: "expenses",
				record_id: id,
				old_value: oldDoc,
				new_value: null,
				reason_for_change: deleteReason,
				user_id: user.uid,
				timestamp: new Date().toISOString(),
			});
		});

		return res.status(200).json({ message: "Deleted successfully" });
	} catch (error: unknown) {
		console.error("Error deleting expense:", error);
		return res
			.status(500)
			.json({ error: (error as Error).message || "Internal server error" });
	}
};

export const verifyExpense = async (req: AuthRequest, res: Response) => {
	const user = req.user;

	const { id } = req.params;

	try {
		const docRef = db.collection(COLLECTIONS.EXPENSES).doc(id);
		const auditRef = db.collection(COLLECTIONS.AUDIT_LOGS).doc();

		await db.runTransaction(async (transaction) => {
			const docSnap = await transaction.get(docRef);
			if (!docSnap.exists) {
				throw new Error("Expense not found");
			}

			const oldDoc = { id: docSnap.id, ...docSnap.data() };

			transaction.update(docRef, { verified: true });

			transaction.set(auditRef, {
				table_affected: "expenses",
				record_id: id,
				old_value: oldDoc,
				new_value: { ...oldDoc, verified: true },
				reason_for_change: "Verified log",
				user_id: user.uid,
				timestamp: new Date().toISOString(),
			});
		});

		return res.status(200).json({ message: "Verified successfully" });
	} catch (error: unknown) {
		console.error("Error verifying expense:", error);
		return res
			.status(500)
			.json({ error: (error as Error).message || "Internal server error" });
	}
};
