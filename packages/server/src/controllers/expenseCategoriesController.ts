import { COLLECTIONS } from "@level-up/shared";
import type { Response } from "express";
import { db } from "../firebase.js";
import type { AuthRequest } from "../middleware/auth.js";
import { logger } from "../utils/logger.js";

export const listExpenseCategories = async (
	_req: AuthRequest,
	res: Response,
) => {
	try {
		const snapshot = await db.collection(COLLECTIONS.EXPENSE_CATEGORIES).get();
		const rows = snapshot.docs.map(
			(doc: FirebaseFirestore.DocumentSnapshot<unknown>) => ({
				id: doc.id,
				...(doc.data() as Record<string, unknown>),
			}),
		);
		return res.status(200).json(rows);
	} catch (error: unknown) {
		logger.error({ err: error }, "Error listing expense categories");
		return res.status(500).json({ error: "Internal server error" });
	}
};

export const createExpenseCategory = async (
	req: AuthRequest,
	res: Response,
) => {
	const user = req.user;
	const { name } = req.body;

	try {
		const existing = await db
			.collection(COLLECTIONS.EXPENSE_CATEGORIES)
			.where("name", "==", name)
			.where("isActive", "==", true)
			.get();

		if (!existing.empty) {
			return res
				.status(409)
				.json({ error: "A category with this name already exists" });
		}

		const newDocRef = db.collection(COLLECTIONS.EXPENSE_CATEGORIES).doc();
		const auditRef = db.collection(COLLECTIONS.AUDIT_LOGS).doc();

		const data = {
			name,
			isActive: true,
			created_at: new Date().toISOString(),
		};

		await db.runTransaction(
			async (transaction: FirebaseFirestore.Transaction) => {
				transaction.set(newDocRef, data);
				transaction.set(auditRef, {
					action: "CREATE",
					table_affected: "expense_categories",
					record_id: newDocRef.id,
					old_value: null,
					new_value: data,
					reason_for_change: "Created expense category",
					user_id: user.uid,
					timestamp: new Date().toISOString(),
				});
			},
		);

		return res.status(201).json({ id: newDocRef.id, ...data });
	} catch (error: unknown) {
		logger.error({ err: error }, "Error creating expense category");
		return res.status(500).json({ error: "Internal server error" });
	}
};

export const updateExpenseCategory = async (
	req: AuthRequest,
	res: Response,
) => {
	const user = req.user;
	const { id } = req.params;
	const { name, isActive, editReason } = req.body;

	try {
		const docRef = db.collection(COLLECTIONS.EXPENSE_CATEGORIES).doc(id);
		const auditRef = db.collection(COLLECTIONS.AUDIT_LOGS).doc();

		const newValues: Record<string, string | boolean> = {};
		if (name !== undefined) newValues.name = name;
		if (isActive !== undefined) newValues.isActive = isActive;

		let updatedCategory: Record<string, unknown> = {};

		await db.runTransaction(
			async (transaction: FirebaseFirestore.Transaction) => {
				const docSnap = await transaction.get(docRef);
				if (!docSnap.exists) {
					throw new Error("Expense category not found");
				}

				const oldDoc = { id: docSnap.id, ...docSnap.data() };
				updatedCategory = { ...oldDoc, ...newValues };

				transaction.update(docRef, newValues);

				transaction.set(auditRef, {
					action: "UPDATE",
					table_affected: "expense_categories",
					record_id: id,
					old_value: oldDoc,
					new_value: updatedCategory,
					reason_for_change: editReason,
					user_id: user.uid,
					timestamp: new Date().toISOString(),
				});
			},
		);

		return res.status(200).json(updatedCategory);
	} catch (error: unknown) {
		logger.error({ err: error }, "Error updating expense category");
		const message = (error as Error).message;
		if (message === "Expense category not found") {
			return res.status(404).json({ error: message });
		}
		return res.status(500).json({ error: "Internal server error" });
	}
};
