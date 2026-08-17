import type { Response } from "express";
import { db } from "../firebase.js";
import type { AuthRequest } from "../middleware/auth.js";

export const listSales = async (_req: AuthRequest, res: Response) => {
	try {
		const snapshot = await db.collection("game_sales_logs").get();
		const rows = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
		return res.status(200).json(rows);
	} catch (error: unknown) {
		console.error("Error listing sales:", error);
		return res
			.status(500)
			.json({ error: (error as Error).message || "Internal server error" });
	}
};

export const createSale = async (req: AuthRequest, res: Response) => {
	const user = req.user;

	const {
		game_id,
		game_name,
		quantity_sold,
		rate_applied,
		calculated_total,
		date,
	} = req.body;

	try {
		const newDocRef = db.collection("game_sales_logs").doc();
		const auditRef = db.collection("audit_logs").doc();

		const data = {
			game_id,
			game_name,
			quantity_sold: parseFloat(quantity_sold),
			rate_applied: parseFloat(rate_applied),
			calculated_total: parseFloat(calculated_total),
			user_id: user.uid,
			date: date ? new Date(date).toISOString() : new Date().toISOString(),
		};

		await db.runTransaction(async (transaction) => {
			transaction.set(newDocRef, data);
			transaction.set(auditRef, {
				table_affected: "game_sales_logs",
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
		console.error("Error creating sale:", error);
		return res.status(500).json({ error: "Internal server error" });
	}
};

export const updateSale = async (req: AuthRequest, res: Response) => {
	const user = req.user;

	const { id } = req.params;
	const {
		game_id,
		game_name,
		quantity_sold,
		rate_applied,
		calculated_total,
		editReason,
	} = req.body;

	try {
		const docRef = db.collection("game_sales_logs").doc(id);
		const auditRef = db.collection("audit_logs").doc();

		await db.runTransaction(async (transaction) => {
			const docSnap = await transaction.get(docRef);
			if (!docSnap.exists) {
				throw new Error("Sale not found");
			}

			const oldDoc = { id: docSnap.id, ...docSnap.data() };

			const newValues = {
				game_id,
				game_name,
				quantity_sold: parseFloat(quantity_sold),
				rate_applied: parseFloat(rate_applied),
				calculated_total: parseFloat(calculated_total),
			};

			transaction.update(docRef, newValues);

			transaction.set(auditRef, {
				table_affected: "game_sales_logs",
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
		console.error("Error updating sale:", error);
		return res
			.status(500)
			.json({ error: (error as Error).message || "Internal server error" });
	}
};

export const deleteSale = async (req: AuthRequest, res: Response) => {
	const user = req.user;

	const { id } = req.params;
	const { deleteReason } = req.body;

	try {
		const docRef = db.collection("game_sales_logs").doc(id);
		const auditRef = db.collection("audit_logs").doc();

		await db.runTransaction(async (transaction) => {
			const docSnap = await transaction.get(docRef);
			if (!docSnap.exists) {
				throw new Error("Sale not found");
			}

			const oldDoc = { id: docSnap.id, ...docSnap.data() };

			transaction.delete(docRef);

			transaction.set(auditRef, {
				table_affected: "game_sales_logs",
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
		console.error("Error deleting sale:", error);
		return res
			.status(500)
			.json({ error: (error as Error).message || "Internal server error" });
	}
};
