import { COLLECTIONS, ROLES } from "@level-up/shared";
import type { Response } from "express";
import { FieldValue } from "firebase-admin/firestore";
import { db } from "../firebase.js";
import type { AuthRequest } from "../middleware/auth.js";
import { safeErrorMessage } from "../utils/safeError.js";

export const listKenoLogs = async (req: AuthRequest, res: Response) => {
	try {
		const { startDate, endDate } = req.query as {
			startDate?: string;
			endDate?: string;
		};

		let query: FirebaseFirestore.Query = db.collection(COLLECTIONS.KENO_LOGS);

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
		console.error("Error listing keno logs:", error);
		return res.status(500).json({ error: safeErrorMessage(error) });
	}
};

export const createKeno = async (req: AuthRequest, res: Response) => {
	const user = req.user;

	const { net_profit, date } = req.body;

	try {
		const userDoc = await db.collection(COLLECTIONS.USERS).doc(user.uid).get();
		const role = userDoc.exists ? userDoc.data()?.role : ROLES.STAFF;
		const displayName = userDoc.exists
			? userDoc.data()?.displayName
			: undefined;

		const newDocRef = db.collection(COLLECTIONS.KENO_LOGS).doc();
		const auditRef = db.collection(COLLECTIONS.AUDIT_LOGS).doc();

		const data = {
			net_profit: parseFloat(net_profit),
			user_id: user.uid,
			...(displayName && { user_name: displayName }),
			date: date ? new Date(date).toISOString() : new Date().toISOString(),
			verified: role === ROLES.MANAGER || role === ROLES.ADMIN,
		};

		await db.runTransaction(async (transaction) => {
			transaction.set(newDocRef, data);
			transaction.set(auditRef, {
				action: "CREATE",
				table_affected: "keno_logs",
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
		console.error("Error creating keno:", error);
		return res.status(500).json({ error: "Internal server error" });
	}
};

export const updateKeno = async (req: AuthRequest, res: Response) => {
	const user = req.user;

	const { id } = req.params;
	const { net_profit, editReason } = req.body;

	try {
		const docRef = db.collection(COLLECTIONS.KENO_LOGS).doc(id);
		const auditRef = db.collection(COLLECTIONS.AUDIT_LOGS).doc();

		await db.runTransaction(async (transaction) => {
			const docSnap = await transaction.get(docRef);
			if (!docSnap.exists) {
				throw new Error("Keno log not found");
			}

			const oldDoc = { id: docSnap.id, ...docSnap.data() };

			// biome-ignore lint/suspicious/noExplicitAny: Firestore update payload
			const newValues: Record<string, any> = {};
			if (net_profit !== undefined)
				newValues.net_profit = parseFloat(net_profit);
			// Legacy rows converge to the net-only shape on any edit; originals persist in audit old_value.
			newValues.sales = FieldValue.delete();
			newValues.payouts = FieldValue.delete();

			transaction.update(docRef, newValues);

			// Audit new_value must be Firestore-valid: delete sentinels are illegal in set(),
			// so record the post-edit converged shape instead of raw sentinel-bearing values.
			const newValueForAudit: Record<string, unknown> = { ...oldDoc };
			delete newValueForAudit.sales;
			delete newValueForAudit.payouts;
			if (net_profit !== undefined) {
				newValueForAudit.net_profit = parseFloat(net_profit);
			}

			transaction.set(auditRef, {
				action: "UPDATE",
				table_affected: "keno_logs",
				record_id: id,
				old_value: oldDoc,
				new_value: newValueForAudit,
				reason_for_change: editReason,
				user_id: user.uid,
				timestamp: new Date().toISOString(),
			});
		});

		const updatedDoc = await db.collection(COLLECTIONS.KENO_LOGS).doc(id).get();
		return res.status(200).json({ id: updatedDoc.id, ...updatedDoc.data() });
	} catch (error: unknown) {
		console.error("Error updating keno:", error);
		return res.status(500).json({ error: safeErrorMessage(error) });
	}
};

export const deleteKeno = async (req: AuthRequest, res: Response) => {
	const user = req.user;

	const { id } = req.params;
	const { deleteReason } = req.body;

	try {
		const docRef = db.collection(COLLECTIONS.KENO_LOGS).doc(id);
		const auditRef = db.collection(COLLECTIONS.AUDIT_LOGS).doc();

		await db.runTransaction(async (transaction) => {
			const docSnap = await transaction.get(docRef);
			if (!docSnap.exists) {
				throw new Error("Keno log not found");
			}

			const oldDoc = { id: docSnap.id, ...docSnap.data() };

			transaction.delete(docRef);

			transaction.set(auditRef, {
				action: "DELETE",
				table_affected: "keno_logs",
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
		console.error("Error deleting keno:", error);
		return res.status(500).json({ error: safeErrorMessage(error) });
	}
};

export const verifyKeno = async (req: AuthRequest, res: Response) => {
	const user = req.user;

	const { id } = req.params;

	try {
		const docRef = db.collection(COLLECTIONS.KENO_LOGS).doc(id);
		const auditRef = db.collection(COLLECTIONS.AUDIT_LOGS).doc();

		await db.runTransaction(async (transaction) => {
			const docSnap = await transaction.get(docRef);
			if (!docSnap.exists) {
				throw new Error("Keno log not found");
			}

			const oldDoc = { id: docSnap.id, ...docSnap.data() };

			transaction.update(docRef, { verified: true });

			transaction.set(auditRef, {
				action: "UPDATE",
				table_affected: "keno_logs",
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
		console.error("Error verifying keno:", error);
		return res.status(500).json({ error: safeErrorMessage(error) });
	}
};
