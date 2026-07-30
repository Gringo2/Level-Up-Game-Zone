import type { Response } from "express";
import { db } from "../firebase.js";
import type { AuthRequest } from "../middleware/auth.js";

export const createExpense = async (req: AuthRequest, res: Response) => {
	const user = req.user;
	if (!user) return res.status(401).json({ error: "Unauthorized" });

	const { description, amount, category } = req.body;

	try {
		const userDoc = await db.collection("users").doc(user.uid).get();
		const role = userDoc.exists ? userDoc.data()?.role : "staff";

		const newDocRef = db.collection("expenses").doc();
		const auditRef = db.collection("audit_logs").doc();

		const data = {
			description,
			amount: parseFloat(amount),
			category,
			user_id: user.uid,
			date: new Date().toISOString(),
			verified: role === "manager" || role === "admin",
		};

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
	if (!user) return res.status(401).json({ error: "Unauthorized" });

	const { id } = req.params;
	const { description, amount, category, editReason } = req.body;

	if (!editReason) {
		return res.status(400).json({ error: "Edit reason is required" });
	}

	try {
		const docRef = db.collection("expenses").doc(id);
		const auditRef = db.collection("audit_logs").doc();

		await db.runTransaction(async (transaction) => {
			const docSnap = await transaction.get(docRef);
			if (!docSnap.exists) {
				throw new Error("Expense not found");
			}

			const oldDoc = { id: docSnap.id, ...docSnap.data() };

			const newValues = {
				description,
				amount: parseFloat(amount),
				category,
			};

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
		});

		return res.status(200).json({ message: "Updated successfully" });
	} catch (error: unknown) {
		console.error("Error updating expense:", error);
		return res
			.status(500)
			.json({ error: (error as Error).message || "Internal server error" });
	}
};

export const deleteExpense = async (req: AuthRequest, res: Response) => {
	const user = req.user;
	if (!user) return res.status(401).json({ error: "Unauthorized" });

	const { id } = req.params;
	const { deleteReason } = req.body;

	if (!deleteReason) {
		return res.status(400).json({ error: "Delete reason is required" });
	}

	try {
		const docRef = db.collection("expenses").doc(id);
		const auditRef = db.collection("audit_logs").doc();

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
	if (!user) return res.status(401).json({ error: "Unauthorized" });

	const { id } = req.params;

	try {
		const docRef = db.collection("expenses").doc(id);
		const auditRef = db.collection("audit_logs").doc();

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
