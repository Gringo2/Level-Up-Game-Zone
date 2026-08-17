import { COLLECTIONS } from "@level-up/shared";
import type { Response } from "express";
import { db } from "../firebase.js";
import type { AuthRequest } from "../middleware/auth.js";

export const listEmployees = async (_req: AuthRequest, res: Response) => {
	try {
		const snapshot = await db.collection(COLLECTIONS.EMPLOYEES).get();
		const rows = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
		return res.status(200).json(rows);
	} catch (error: unknown) {
		console.error("Error listing employees:", error);
		return res
			.status(500)
			.json({ error: (error as Error).message || "Internal server error" });
	}
};

export const createEmployee = async (req: AuthRequest, res: Response) => {
	const user = req.user;

	const { name, position, base_salary, hired_date, break_day } = req.body;

	try {
		const newDocRef = db.collection(COLLECTIONS.EMPLOYEES).doc();
		const auditRef = db.collection(COLLECTIONS.AUDIT_LOGS).doc();

		const data = {
			name,
			position,
			base_salary: parseFloat(base_salary),
			hired_date,
			break_day: break_day || null,
			isActive: true,
			created_at: new Date().toISOString(),
		};

		await db.runTransaction(async (transaction) => {
			transaction.set(newDocRef, data);
			transaction.set(auditRef, {
				table_affected: "employees",
				record_id: newDocRef.id,
				old_value: null,
				new_value: data,
				reason_for_change: "Employee created",
				user_id: user.uid,
				timestamp: new Date().toISOString(),
			});
		});

		return res.status(201).json({ id: newDocRef.id, ...data });
	} catch (error: unknown) {
		console.error("Error creating employee:", error);
		return res
			.status(500)
			.json({ error: (error as Error).message || "Internal server error" });
	}
};

export const updateEmployee = async (req: AuthRequest, res: Response) => {
	const user = req.user;

	const { id } = req.params;
	const {
		name,
		position,
		base_salary,
		hired_date,
		break_day,
		isActive,
		editReason,
	} = req.body;

	try {
		const docRef = db.collection(COLLECTIONS.EMPLOYEES).doc(id);
		const auditRef = db.collection(COLLECTIONS.AUDIT_LOGS).doc();

		await db.runTransaction(async (transaction) => {
			const docSnap = await transaction.get(docRef);
			if (!docSnap.exists) {
				throw new Error("Employee not found");
			}

			const oldDoc = { id: docSnap.id, ...docSnap.data() };
			// biome-ignore lint/suspicious/noExplicitAny: Firestore update payload
			const newValues: Record<string, any> = {};

			if (name !== undefined) newValues.name = name;
			if (position !== undefined) newValues.position = position;
			if (base_salary !== undefined)
				newValues.base_salary = parseFloat(base_salary);
			if (hired_date !== undefined) newValues.hired_date = hired_date;
			if (break_day !== undefined) newValues.break_day = break_day;
			if (isActive !== undefined) newValues.isActive = isActive;

			transaction.update(docRef, newValues);
			transaction.set(auditRef, {
				table_affected: "employees",
				record_id: id,
				old_value: oldDoc,
				new_value: { ...oldDoc, ...newValues },
				reason_for_change: editReason,
				user_id: user.uid,
				timestamp: new Date().toISOString(),
			});
		});

		return res.status(200).json({ message: "Employee updated successfully" });
	} catch (error: unknown) {
		console.error("Error updating employee:", error);
		return res
			.status(500)
			.json({ error: (error as Error).message || "Internal server error" });
	}
};
