import { COLLECTIONS } from "@level-up/shared";
import type { Response } from "express";
import { db } from "../firebase.js";
import type { AuthRequest } from "../middleware/auth.js";

export const listRates = async (_req: AuthRequest, res: Response) => {
	try {
		const snapshot = await db.collection(COLLECTIONS.GAME_RATES).get();
		const rows = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
		return res.status(200).json(rows);
	} catch (error: unknown) {
		console.error("Error listing rates:", error);
		return res
			.status(500)
			.json({ error: (error as Error).message || "Internal server error" });
	}
};

export const createRate = async (req: AuthRequest, res: Response) => {
	const user = req.user;

	const { game_name, price_per_unit, unit_type, isActive } = req.body;

	try {
		const normalizedTarget = game_name.trim().toLowerCase();

		const existingSnapshot = await db.collection(COLLECTIONS.GAME_RATES).get();
		const allDocRefs = existingSnapshot.docs.map((doc) =>
			db.collection(COLLECTIONS.GAME_RATES).doc(doc.id),
		);

		const newDocRef = db.collection(COLLECTIONS.GAME_RATES).doc();
		const auditRef = db.collection(COLLECTIONS.AUDIT_LOGS).doc();

		const data = {
			game_name: game_name.trim(),
			price_per_unit: parseFloat(price_per_unit),
			unit_type,
			isActive: isActive ?? true,
		};

		await db.runTransaction(async (transaction) => {
			const allDocs =
				allDocRefs.length > 0 ? await transaction.getAll(...allDocRefs) : [];
			const duplicate = allDocs.some((doc) => {
				// biome-ignore lint/suspicious/noExplicitAny: Firestore document data
				const d = doc.data() as Record<string, any> | undefined;
				return (
					doc.exists &&
					d?.isActive &&
					d?.game_name?.trim().toLowerCase() === normalizedTarget
				);
			});
			if (duplicate) {
				throw new Error("DUPLICATE_NAME");
			}

			transaction.set(newDocRef, data);
			transaction.set(auditRef, {
				table_affected: "game_rates",
				record_id: newDocRef.id,
				old_value: null,
				new_value: data,
				reason_for_change: "Created game rate",
				user_id: user.uid,
				timestamp: new Date().toISOString(),
			});
		});

		return res.status(201).json({ id: newDocRef.id, ...data });
	} catch (error: unknown) {
		if ((error as Error).message === "DUPLICATE_NAME") {
			return res.status(409).json({
				error: "An active game rate with this name already exists",
			});
		}
		console.error("Error creating rate:", error);
		return res
			.status(500)
			.json({ error: (error as Error).message || "Internal server error" });
	}
};

export const updateRate = async (req: AuthRequest, res: Response) => {
	const user = req.user;

	const { id } = req.params;
	const { game_name, price_per_unit, unit_type, isActive, editReason } =
		req.body;

	try {
		const docRef = db.collection(COLLECTIONS.GAME_RATES).doc(id);
		const auditRef = db.collection(COLLECTIONS.AUDIT_LOGS).doc();

		await db.runTransaction(async (transaction) => {
			const docSnap = await transaction.get(docRef);
			if (!docSnap.exists) {
				throw new Error("Rate not found");
			}

			const oldDoc = { id: docSnap.id, ...docSnap.data() };

			const newValues: Record<string, string | number | boolean> = {};
			if (game_name !== undefined) newValues.game_name = game_name;
			if (price_per_unit !== undefined)
				newValues.price_per_unit = parseFloat(price_per_unit);
			if (unit_type !== undefined) newValues.unit_type = unit_type;
			if (isActive !== undefined) newValues.isActive = isActive;

			transaction.update(docRef, newValues);

			transaction.set(auditRef, {
				table_affected: "game_rates",
				record_id: id,
				old_value: oldDoc,
				new_value: { ...oldDoc, ...newValues },
				reason_for_change: editReason,
				user_id: user.uid,
				timestamp: new Date().toISOString(),
			});
		});

		const updatedDoc = await db
			.collection(COLLECTIONS.GAME_RATES)
			.doc(id)
			.get();
		return res.status(200).json({ id: updatedDoc.id, ...updatedDoc.data() });
	} catch (error: unknown) {
		console.error("Error updating rate:", error);
		return res
			.status(500)
			.json({ error: (error as Error).message || "Internal server error" });
	}
};
