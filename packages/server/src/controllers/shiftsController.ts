import type { Response } from "express";
import type { QueryDocumentSnapshot } from "firebase-admin/firestore";
import { db } from "../firebase.js";
import type { AuthRequest } from "../middleware/auth.js";

export const listShifts = async (req: AuthRequest, res: Response) => {
	const user = req.user;
	if (!user) return res.status(401).json({ error: "Unauthorized" });

	try {
		await autoLabelStaleShifts();
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

const autoLabelStaleShifts = async () => {
	try {
		const openShiftsSnap = await db
			.collection("shifts")
			.where("status", "==", "OPEN")
			.get();
		const now = new Date();
		// Local calendar date (YYYY-MM-DD)
		const todayDateString = now.toLocaleDateString("en-CA");

		for (const doc of openShiftsSnap.docs) {
			const shift = doc.data();
			const shiftStartDateString = new Date(
				shift.start_time,
			).toLocaleDateString("en-CA");
			if (shiftStartDateString !== todayDateString) {
				await doc.ref.update({ status: "MISSED" });
			}
		}
	} catch (err) {
		console.error("Error auto-labeling stale shifts:", err);
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

export const updateFloat = async (req: AuthRequest, res: Response) => {
	const user = req.user;
	if (!user) return res.status(401).json({ error: "Unauthorized" });

	const { id } = req.params;
	const { floatAmount } = req.body;

	if (floatAmount === undefined || floatAmount === null) {
		return res.status(400).json({ error: "floatAmount is required" });
	}

	try {
		const shiftRef = db.collection("shifts").doc(id);
		const shiftDoc = await shiftRef.get();

		if (!shiftDoc.exists) {
			return res.status(404).json({ error: "Shift not found" });
		}

		if (shiftDoc.data()?.status !== "OPEN") {
			return res
				.status(400)
				.json({ error: "Only open shifts can have their float updated" });
		}

		const newFloat = parseFloat(floatAmount);

		await db.runTransaction(async (transaction) => {
			transaction.update(shiftRef, { opening_float: newFloat });

			const auditRef = db.collection("audit_logs").doc();
			transaction.set(auditRef, {
				table_affected: "shifts",
				record_id: id,
				old_value: { opening_float: shiftDoc.data()?.opening_float },
				new_value: { opening_float: newFloat },
				reason_for_change: "Updated opening float",
				user_id: user.uid,
				timestamp: new Date().toISOString(),
			});
		});

		return res
			.status(200)
			.json({ message: "Float updated successfully", opening_float: newFloat });
	} catch (error) {
		console.error("Error updating float:", error);
		return res.status(500).json({ error: "Internal server error" });
	}
};

export const getMissedData = async (req: AuthRequest, res: Response) => {
	try {
		await autoLabelStaleShifts();

		const missedShiftsSnap = await db
			.collection("shifts")
			.where("status", "==", "MISSED")
			.get();
		const missedShifts = missedShiftsSnap.docs.map((doc) => ({
			id: doc.id,
			...doc.data(),
		}));

		const lastShiftSnap = await db
			.collection("shifts")
			.orderBy("start_time", "desc")
			.limit(1)
			.get();

		const gapDates: string[] = [];
		if (!lastShiftSnap.empty) {
			const lastShift = lastShiftSnap.docs[0].data();
			const lastShiftDate = new Date(lastShift.start_time);
			const today = new Date();

			const checkDate = new Date(lastShiftDate);
			checkDate.setDate(checkDate.getDate() + 1);

			while (
				checkDate.toLocaleDateString("en-CA") <
				today.toLocaleDateString("en-CA")
			) {
				gapDates.push(checkDate.toLocaleDateString("en-CA"));
				checkDate.setDate(checkDate.getDate() + 1);
			}
		}

		let resolvedDates: string[] = [];
		if (gapDates.length > 0) {
			const earliestGap = gapDates[0];
			const resolutionsSnap = await db
				.collection("missed_day_resolutions")
				.where("date", ">=", earliestGap)
				.get();
			resolvedDates = resolutionsSnap.docs.map((doc) => doc.data().date);
		}

		const unresolvedGaps = gapDates.filter(
			(date) => !resolvedDates.includes(date),
		);

		let newlyOpenedShift = null;

		// AUTO-OPEN LOGIC
		if (unresolvedGaps.length === 0 && missedShifts.length === 0) {
			const openShiftsSnap = await db
				.collection("shifts")
				.where("status", "==", "OPEN")
				.get();

			if (openShiftsSnap.empty) {
				const newDocRef = db.collection("shifts").doc();
				const auditRef = db.collection("audit_logs").doc();

				const user = req.user;
				const data = {
					manager_id: user?.uid || "system",
					manager_name: user?.email || "System Auto-Open",
					start_time: new Date().toISOString(),
					opening_float: 0,
					status: "OPEN",
				};

				await db.runTransaction(async (transaction) => {
					transaction.set(newDocRef, data);
					transaction.set(auditRef, {
						table_affected: "shifts",
						record_id: newDocRef.id,
						old_value: null,
						new_value: data,
						reason_for_change: "Auto-opened shift for new day",
						user_id: user?.uid || "system",
						timestamp: new Date().toISOString(),
					});
				});

				newlyOpenedShift = { id: newDocRef.id, ...data };
			}
		}

		return res.status(200).json({
			missedShifts,
			gapDates: unresolvedGaps,
			newlyOpenedShift,
		});
	} catch (error) {
		console.error("Error getting missed data:", error);
		return res.status(500).json({ error: "Internal server error" });
	}
};

export const resolveMissedData = async (req: AuthRequest, res: Response) => {
	const user = req.user;
	if (!user) return res.status(401).json({ error: "Unauthorized" });

	try {
		const {
			date,
			status,
			notes,
			expected_cash_calculated,
			actual_cash_counted,
			shift_id,
		} = req.body;

		// If they are resolving a stale shift, update the shift status
		if (shift_id) {
			await db
				.collection("shifts")
				.doc(shift_id)
				.update({
					status: "CLOSED",
					actual_cash_counted: actual_cash_counted || 0,
					expected_cash_calculated: expected_cash_calculated || 0,
					variance:
						(actual_cash_counted || 0) - (expected_cash_calculated || 0),
					end_time: new Date().toISOString(),
					reason_for_shortage: notes || "Resolved Missed Shift",
				});
		} else {
			// Otherwise it's a gap day, create a resolution record
			const newDocRef = db.collection("missed_day_resolutions").doc();
			await newDocRef.set({
				date,
				status,
				notes: notes || "",
				expected_cash_calculated,
				actual_cash_counted,
				variance:
					status === "DATA_FILLED"
						? (actual_cash_counted || 0) - (expected_cash_calculated || 0)
						: 0,
				resolved_by_id: user.uid,
				resolved_by_name: user.email || "Unknown",
				resolved_at: new Date().toISOString(),
			});
		}

		return res.status(200).json({ message: "Resolved successfully" });
	} catch (error) {
		console.error("Error resolving missed data:", error);
		return res.status(500).json({ error: "Internal server error" });
	}
};
