import { COLLECTIONS } from "@level-up/shared";
import type { Response } from "express";
import { db } from "../firebase.js";
import type { AuthRequest } from "../middleware/auth.js";
import { logger } from "../utils/logger.js";
import { safeErrorMessage } from "../utils/safeError.js";

export const listRates = async (_req: AuthRequest, res: Response) => {
	try {
		const snapshot = await db.collection(COLLECTIONS.GAME_RATES).get();
		const rows = snapshot.docs.map(
			(doc: FirebaseFirestore.DocumentSnapshot<unknown>) => ({
				id: doc.id,
				...(doc.data() as Record<string, unknown>),
			}),
		);
		return res.status(200).json(rows);
	} catch (error: unknown) {
		logger.error({ err: error }, "Error listing rates");
		return res.status(500).json({ error: safeErrorMessage(error) });
	}
};

export const createRate = async (req: AuthRequest, res: Response) => {
	const user = req.user;

	const { game_name, price_per_unit, unit_type, isActive } = req.body;

	try {
		const normalizedTarget = game_name.trim().toLowerCase();

		const existingSnapshot = await db.collection(COLLECTIONS.GAME_RATES).get();
		const allDocRefs = existingSnapshot.docs.map(
			(doc: FirebaseFirestore.DocumentSnapshot<unknown>) =>
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

		await db.runTransaction(
			async (transaction: FirebaseFirestore.Transaction) => {
				const allDocs =
					allDocRefs.length > 0 ? await transaction.getAll(...allDocRefs) : [];
				const duplicate = allDocs.some(
					(doc: FirebaseFirestore.DocumentSnapshot<unknown>) => {
						// biome-ignore lint/suspicious/noExplicitAny: Firestore document data
						const d = doc.data() as Record<string, any> | undefined;
						return (
							doc.exists &&
							d?.isActive &&
							d?.game_name?.trim().toLowerCase() === normalizedTarget
						);
					},
				);
				if (duplicate) {
					throw new Error("DUPLICATE_NAME");
				}

				transaction.set(newDocRef, data);
				transaction.set(auditRef, {
					action: "CREATE",
					table_affected: "game_rates",
					record_id: newDocRef.id,
					old_value: null,
					new_value: data,
					reason_for_change: "Created game rate",
					user_id: user.uid,
					timestamp: new Date().toISOString(),
				});
			},
		);

		return res.status(201).json({ id: newDocRef.id, ...data });
	} catch (error: unknown) {
		if ((error as Error).message === "DUPLICATE_NAME") {
			return res.status(409).json({
				error: "An active game rate with this name already exists",
			});
		}
		logger.error({ err: error }, "Error creating rate");
		return res.status(500).json({ error: safeErrorMessage(error) });
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

		const normalizedTarget =
			game_name !== undefined ? game_name.trim().toLowerCase() : null;

		// biome-ignore lint/suspicious/noExplicitAny: Firestore document reference type
		let allDocRefs: any[] = [];
		if (normalizedTarget !== null) {
			const existingSnapshot = await db
				.collection(COLLECTIONS.GAME_RATES)
				.get();
			allDocRefs = existingSnapshot.docs.map(
				(doc: FirebaseFirestore.DocumentSnapshot<unknown>) =>
					db.collection(COLLECTIONS.GAME_RATES).doc(doc.id),
			);
		}

		await db.runTransaction(
			async (transaction: FirebaseFirestore.Transaction) => {
				if (normalizedTarget !== null && allDocRefs) {
					const allDocs =
						allDocRefs.length > 0
							? await transaction.getAll(...allDocRefs)
							: [];
					const duplicate = allDocs.some(
						(doc: FirebaseFirestore.DocumentSnapshot<unknown>) => {
							// biome-ignore lint/suspicious/noExplicitAny: Firestore document data
							const d = doc.data() as Record<string, any> | undefined;
							return (
								doc.exists &&
								doc.id !== id &&
								d?.isActive &&
								d?.game_name?.trim().toLowerCase() === normalizedTarget
							);
						},
					);
					if (duplicate) {
						throw new Error("DUPLICATE_NAME");
					}
				}

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
					action: "UPDATE",
					table_affected: "game_rates",
					record_id: id,
					old_value: oldDoc,
					new_value: { ...oldDoc, ...newValues },
					reason_for_change: editReason,
					user_id: user.uid,
					timestamp: new Date().toISOString(),
				});
			},
		);

		const updatedDoc = await db
			.collection(COLLECTIONS.GAME_RATES)
			.doc(id)
			.get();
		return res.status(200).json({ id: updatedDoc.id, ...updatedDoc.data() });
	} catch (error: unknown) {
		if ((error as Error).message === "DUPLICATE_NAME") {
			return res.status(409).json({
				error: "An active game rate with this name already exists",
			});
		}
		logger.error({ err: error }, "Error updating rate");
		return res.status(500).json({ error: safeErrorMessage(error) });
	}
};
