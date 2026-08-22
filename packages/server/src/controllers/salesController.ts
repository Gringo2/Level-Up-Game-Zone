import { COLLECTIONS } from "@level-up/shared";
import type { Response } from "express";
import { db } from "../firebase.js";
import type { AuthRequest } from "../middleware/auth.js";
import { safeErrorMessage } from "../utils/safeError.js";

export const listSales = async (req: AuthRequest, res: Response) => {
	try {
		const { startDate, endDate } = req.query as {
			startDate?: string;
			endDate?: string;
		};

		let query: FirebaseFirestore.Query = db.collection(
			COLLECTIONS.GAME_SALES_LOGS,
		);

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
		console.error("Error listing sales:", error);
		return res.status(500).json({ error: safeErrorMessage(error) });
	}
};

export const createSale = async (req: AuthRequest, res: Response) => {
	const user = req.user;

	const { game_id, game_name, quantity_sold, date } = req.body;

	try {
		const userDoc = await db.collection(COLLECTIONS.USERS).doc(user.uid).get();
		const displayName = userDoc.exists
			? userDoc.data()?.displayName
			: undefined;

		const newDocRef = db.collection(COLLECTIONS.GAME_SALES_LOGS).doc();
		const auditRef = db.collection(COLLECTIONS.AUDIT_LOGS).doc();

		const rateSnap = await db
			.collection(COLLECTIONS.GAME_RATES)
			.doc(game_id)
			.get();
		if (!rateSnap.exists) {
			return res.status(400).json({ error: "Invalid game" });
		}
		const rateData = rateSnap.data();
		const quantity = parseFloat(quantity_sold);
		const price = parseFloat(rateData?.price_per_unit);

		const data = {
			game_id,
			game_name: rateData?.game_name ?? game_name,
			quantity_sold: quantity,
			rate_applied: price,
			calculated_total: quantity * price,
			user_id: user.uid,
			...(displayName && { user_name: displayName }),
			date: date ? new Date(date).toISOString() : new Date().toISOString(),
		};

		await db.runTransaction(async (transaction) => {
			transaction.set(newDocRef, data);
			transaction.set(auditRef, {
				action: "CREATE",
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
		const docRef = db.collection(COLLECTIONS.GAME_SALES_LOGS).doc(id);
		const auditRef = db.collection(COLLECTIONS.AUDIT_LOGS).doc();

		await db.runTransaction(async (transaction) => {
			const docSnap = await transaction.get(docRef);
			if (!docSnap.exists) {
				throw new Error("Sale not found");
			}

			const oldData = (docSnap.data() ?? {}) as {
				game_id?: string;
				game_name?: string;
				quantity_sold?: number;
			};
			const oldDoc = { id: docSnap.id, ...oldData };

			// Server-authoritative math (TD-026 / M-76 A1): resolve the effective
			// rate document and recompute — client-sent totals are ignored.
			const effectiveGameId =
				(game_id !== undefined ? String(game_id) : oldDoc.game_id) ?? "";
			const rateSnap = await db
				.collection(COLLECTIONS.GAME_RATES)
				.doc(effectiveGameId)
				.get();
			if (!rateSnap.exists) {
				throw new Error("Invalid game");
			}
			const rateData = rateSnap.data();
			const price = parseFloat(rateData?.price_per_unit);
			const quantity =
				quantity_sold !== undefined
					? parseFloat(quantity_sold)
					: Number(oldDoc.quantity_sold);

			// biome-ignore lint/suspicious/noExplicitAny: Firestore update payload
			const newValues: Record<string, any> = {};
			newValues.game_id = effectiveGameId;
			newValues.game_name = rateData?.game_name ?? oldDoc.game_name;
			if (quantity_sold !== undefined) newValues.quantity_sold = quantity;
			newValues.rate_applied = price;
			newValues.calculated_total = quantity * price;

			transaction.update(docRef, newValues);

			transaction.set(auditRef, {
				action: "UPDATE",
				table_affected: "game_sales_logs",
				record_id: id,
				old_value: oldDoc,
				new_value: { ...oldDoc, ...newValues },
				reason_for_change: editReason,
				user_id: user.uid,
				timestamp: new Date().toISOString(),
			});
		});

		// Re-read to return full merged object
		const updatedDoc = await db
			.collection(COLLECTIONS.GAME_SALES_LOGS)
			.doc(id)
			.get();
		return res.status(200).json({ id: updatedDoc.id, ...updatedDoc.data() });
	} catch (error: unknown) {
		console.error("Error updating sale:", error);
		if ((error as Error).message === "Invalid game") {
			return res.status(400).json({ error: "Invalid game" });
		}
		return res.status(500).json({ error: safeErrorMessage(error) });
	}
};

export const deleteSale = async (req: AuthRequest, res: Response) => {
	const user = req.user;

	const { id } = req.params;
	const { deleteReason } = req.body;

	try {
		const docRef = db.collection(COLLECTIONS.GAME_SALES_LOGS).doc(id);
		const auditRef = db.collection(COLLECTIONS.AUDIT_LOGS).doc();

		await db.runTransaction(async (transaction) => {
			const docSnap = await transaction.get(docRef);
			if (!docSnap.exists) {
				throw new Error("Sale not found");
			}

			const oldData = (docSnap.data() ?? {}) as {
				game_id?: string;
				game_name?: string;
				quantity_sold?: number;
			};
			const oldDoc = { id: docSnap.id, ...oldData };

			transaction.delete(docRef);

			transaction.set(auditRef, {
				action: "DELETE",
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
		return res.status(500).json({ error: safeErrorMessage(error) });
	}
};
