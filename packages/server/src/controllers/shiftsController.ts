import type { Request, Response } from "express";
import type { QueryDocumentSnapshot } from "firebase-admin/firestore";
import { db } from "../firebase.js";

export const closeShift = async (req: Request, res: Response) => {
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
