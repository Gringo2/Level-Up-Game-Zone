import { COLLECTIONS, CREDIT_STATUSES } from "@level-up/shared";
import type { Response } from "express";
import { db } from "../firebase.js";
import type { AuthRequest } from "../middleware/auth.js";

export const listCredits = async (_req: AuthRequest, res: Response) => {
	try {
		const snapshot = await db.collection(COLLECTIONS.CREDITS).get();
		const rows = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
		return res.status(200).json(rows);
	} catch (error: unknown) {
		console.error("Error listing credits:", error);
		return res
			.status(500)
			.json({ error: (error as Error).message || "Internal server error" });
	}
};

export const createCredit = async (req: AuthRequest, res: Response) => {
	const user = req.user;

	const { employee_name, amount, reason, date } = req.body;

	try {
		const newDocRef = db.collection(COLLECTIONS.CREDITS).doc();
		const auditRef = db.collection(COLLECTIONS.AUDIT_LOGS).doc();

		const data = {
			employee_name,
			amount: parseFloat(amount),
			reason,
			status: CREDIT_STATUSES.PENDING,
			user_id: user.uid,
			date: date ? new Date(date).toISOString() : new Date().toISOString(),
		};

		await db.runTransaction(async (transaction) => {
			transaction.set(newDocRef, data);
			transaction.set(auditRef, {
				table_affected: "credits",
				record_id: newDocRef.id,
				old_value: null,
				new_value: data,
				reason_for_change: "Created credit",
				user_id: user.uid,
				timestamp: new Date().toISOString(),
			});
		});

		return res.status(201).json({ id: newDocRef.id, ...data });
	} catch (error: unknown) {
		console.error("Error creating credit:", error);
		return res
			.status(500)
			.json({ error: (error as Error).message || "Internal server error" });
	}
};

export const updateCredit = async (req: AuthRequest, res: Response) => {
	const user = req.user;

	const { id } = req.params;
	const { employee_name, amount, reason, status, editReason } = req.body;

	if (!editReason) {
		return res.status(400).json({ error: "Edit reason is required" });
	}

	try {
		const docRef = db.collection(COLLECTIONS.CREDITS).doc(id);
		const auditRef = db.collection(COLLECTIONS.AUDIT_LOGS).doc();

		await db.runTransaction(async (transaction) => {
			const docSnap = await transaction.get(docRef);
			if (!docSnap.exists) {
				throw new Error("Credit not found");
			}

			const oldDoc = { id: docSnap.id, ...docSnap.data() };

			const newValues: Record<string, string | number> = {};
			if (employee_name !== undefined) newValues.employee_name = employee_name;
			if (amount !== undefined) newValues.amount = parseFloat(amount);
			if (reason !== undefined) newValues.reason = reason;
			if (status !== undefined) {
				newValues.status = status;
				newValues.resolved_date = new Date().toISOString();
			}

			transaction.update(docRef, newValues);

			transaction.set(auditRef, {
				table_affected: "credits",
				record_id: id,
				old_value: oldDoc,
				new_value: { ...oldDoc, ...newValues },
				reason_for_change: editReason,
				user_id: user.uid,
				timestamp: new Date().toISOString(),
			});
		});

		return res.status(200).json({ message: "Updated successfully" });
	} catch (error: unknown) {
		console.error("Error updating credit:", error);
		return res
			.status(500)
			.json({ error: (error as Error).message || "Internal server error" });
	}
};

export const deleteCredit = async (req: AuthRequest, res: Response) => {
	const user = req.user;

	const { id } = req.params;
	const { deleteReason } = req.body;

	try {
		const docRef = db.collection(COLLECTIONS.CREDITS).doc(id);
		const auditRef = db.collection(COLLECTIONS.AUDIT_LOGS).doc();

		await db.runTransaction(async (transaction) => {
			const docSnap = await transaction.get(docRef);
			if (!docSnap.exists) {
				throw new Error("Credit not found");
			}

			const oldDoc = { id: docSnap.id, ...docSnap.data() };

			transaction.delete(docRef);

			transaction.set(auditRef, {
				table_affected: "credits",
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
		console.error("Error deleting credit:", error);
		return res
			.status(500)
			.json({ error: (error as Error).message || "Internal server error" });
	}
};
