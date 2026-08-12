import type { Response } from "express";
import type { QueryDocumentSnapshot } from "firebase-admin/firestore";
import { db } from "../firebase.js";
import type { AuthRequest } from "../middleware/auth.js";

export const listShifts = async (req: AuthRequest, res: Response) => {
	const user = req.user;
	if (!user) return res.status(401).json({ error: "Unauthorized" });

	try {
		const snapshot = await db.collection("shifts").get();
		const rows = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
		return res.status(200).json(rows);
	} catch (error: unknown) {
		console.error("Error listing shifts:", error);
		return res
			.status(500)
			.json({ error: (error as Error).message || "Internal server error" });
	}
};

export const startShift = async (req: AuthRequest, res: Response) => {
	const user = req.user;
	if (!user) return res.status(401).json({ error: "Unauthorized" });

	const { floatAmount, managerName } = req.body;

	if (floatAmount === undefined || floatAmount === null) {
		return res.status(400).json({ error: "floatAmount is required" });
	}

	try {
		const openShiftsSnap = await db
			.collection("shifts")
			.where("status", "==", "OPEN")
			.get();

		if (!openShiftsSnap.empty) {
			return res.status(400).json({ error: "An active shift is already open" });
		}

		const newDocRef = db.collection("shifts").doc();
		const auditRef = db.collection("audit_logs").doc();

		const data = {
			manager_id: user.uid,
			manager_name: managerName || user.email || "Unknown",
			start_time: new Date().toISOString(),
			opening_float: parseFloat(floatAmount),
			status: "OPEN",
		};

		await db.runTransaction(async (transaction) => {
			transaction.set(newDocRef, data);
			transaction.set(auditRef, {
				table_affected: "shifts",
				record_id: newDocRef.id,
				old_value: null,
				new_value: data,
				reason_for_change: "Started shift",
				user_id: user.uid,
				timestamp: new Date().toISOString(),
			});
		});

		return res.status(201).json({ id: newDocRef.id, ...data });
	} catch (error: unknown) {
		console.error("Error starting shift:", error);
		return res
			.status(500)
			.json({ error: (error as Error).message || "Internal server error" });
	}
};

export const closeShift = async (req: AuthRequest, res: Response) => {
	try {
		const { id } = req.params;
		const { actualCashCounted, shortageReason } = req.body;

		if (actualCashCounted === undefined || actualCashCounted === null) {
			return res.status(400).json({ error: "actualCashCounted is required" });
		}

		const shiftRef = db.collection("shifts").doc(id);
		const shiftDoc = await shiftRef.get();

		if (!shiftDoc.exists) {
			return res.status(404).json({ error: "Shift not found" });
		}

		const shiftData = shiftDoc.data();
		if (!shiftData) return res.status(404).json({ error: "Shift data empty" });

		if (shiftData.status === "CLOSED") {
			return res.status(400).json({ error: "Shift is already closed" });
		}

		const startTime = shiftData.start_time;

		// Fetch dependent data securely on the backend
		const [gameSalesSnap, kenoSnap, creditsSnap, expensesSnap] =
			await Promise.all([
				db.collection("game_sales_logs").where("date", ">=", startTime).get(),
				db.collection("keno_logs").where("date", ">=", startTime).get(),
				db.collection("credits").where("date", ">=", startTime).get(),
				db.collection("expenses").where("date", ">=", startTime).get(),
			]);

		const totalGameSales = gameSalesSnap.docs.reduce(
			(sum: number, doc: QueryDocumentSnapshot) =>
				sum + (doc.data().calculated_total || 0),
			0,
		);
		const totalKenoNet = kenoSnap.docs.reduce(
			(sum: number, doc: QueryDocumentSnapshot) =>
				sum + (doc.data().net_profit || 0),
			0,
		);
		const pendingCredits = creditsSnap.docs
			.filter((doc: QueryDocumentSnapshot) => doc.data().status === "Pending")
			.reduce(
				(sum: number, doc: QueryDocumentSnapshot) =>
					sum + (doc.data().amount || 0),
				0,
			);
		const totalExpenses = expensesSnap.docs.reduce(
			(sum: number, doc: QueryDocumentSnapshot) =>
				sum + (doc.data().amount || 0),
			0,
		);

		const expectedCash =
			(shiftData.opening_float || 0) +
			totalKenoNet +
			totalGameSales -
			totalExpenses -
			pendingCredits;
		const variance = Number(actualCashCounted) - expectedCash;

		if (Math.abs(variance) > 2 && !shortageReason) {
			return res.status(400).json({
				error:
					"Variance is greater than $2.00. Please provide a reason for the shortage.",
			});
		}

		const updateData = {
			end_time: new Date().toISOString(),
			actual_cash_counted: Number(actualCashCounted),
			expected_cash_calculated: expectedCash,
			variance: variance,
			reason_for_shortage: shortageReason || "",
			status: "CLOSED",
		};

		await shiftRef.update(updateData);

		return res
			.status(200)
			.json({ message: "Shift closed successfully", data: updateData });
	} catch (error: unknown) {
		console.error("Error closing shift:", error);
		return res.status(500).json({ error: "Internal server error" });
	}
};
