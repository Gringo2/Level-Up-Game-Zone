import {
	COLLECTIONS,
	CREDIT_STATUSES,
	SHIFT_STATUSES,
	SYSTEM_IDENTITY,
	VARIANCE_THRESHOLD_FOR_EXPLANATION,
} from "@level-up/shared";
import type { Response } from "express";
import type { QueryDocumentSnapshot } from "firebase-admin/firestore";
import { db } from "../firebase.js";
import type { AuthRequest } from "../middleware/auth.js";

export const listShifts = async (req: AuthRequest, res: Response) => {
	try {
		await autoLabelStaleShifts();
		const { startDate, endDate } = req.query as {
			startDate?: string;
			endDate?: string;
		};

		let query: FirebaseFirestore.Query = db.collection(COLLECTIONS.SHIFTS);

		if (startDate) {
			query = query.where("start_time", ">=", startDate);
		}
		if (endDate) {
			query = query.where("start_time", "<=", endDate);
		}

		const snapshot = await query.orderBy("start_time", "desc").get();
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
			.collection(COLLECTIONS.SHIFTS)
			.where("status", "==", SHIFT_STATUSES.OPEN)
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
				await doc.ref.update({ status: SHIFT_STATUSES.MISSED });
			}
		}
	} catch (err) {
		console.error("Error auto-labeling stale shifts:", err);
	}
};

export const startShift = async (req: AuthRequest, res: Response) => {
	const user = req.user;

	const { floatAmount, managerName } = req.body;

	try {
		const openShiftsSnap = await db
			.collection(COLLECTIONS.SHIFTS)
			.where("status", "==", SHIFT_STATUSES.OPEN)
			.get();

		if (!openShiftsSnap.empty) {
			return res.status(400).json({ error: "An active shift is already open" });
		}

		const newDocRef = db.collection(COLLECTIONS.SHIFTS).doc();
		const auditRef = db.collection(COLLECTIONS.AUDIT_LOGS).doc();

		const data = {
			manager_id: user.uid,
			manager_name: managerName || user.email || "Unknown",
			start_time: new Date().toISOString(),
			opening_float: parseFloat(floatAmount),
			status: SHIFT_STATUSES.OPEN,
		};

		await db.runTransaction(async (transaction) => {
			transaction.set(newDocRef, data);
			transaction.set(auditRef, {
				action: "CREATE",
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

		const shiftRef = db.collection(COLLECTIONS.SHIFTS).doc(id);
		const initialShiftDoc = await shiftRef.get();

		if (!initialShiftDoc.exists) {
			return res.status(404).json({ error: "Shift not found" });
		}

		const initialShiftData = initialShiftDoc.data();
		if (!initialShiftData)
			return res.status(404).json({ error: "Shift data empty" });

		if (initialShiftData.status === SHIFT_STATUSES.CLOSED) {
			return res.status(400).json({ error: "Shift is already closed" });
		}

		const startTime = initialShiftData.start_time;

		// Fetch dependent data securely on the backend
		const [gameSalesSnap, kenoSnap, creditsSnap, expensesSnap] =
			await Promise.all([
				db
					.collection(COLLECTIONS.GAME_SALES_LOGS)
					.where("date", ">=", startTime)
					.get(),
				db
					.collection(COLLECTIONS.KENO_LOGS)
					.where("date", ">=", startTime)
					.get(),
				db.collection(COLLECTIONS.CREDITS).where("date", ">=", startTime).get(),
				db
					.collection(COLLECTIONS.EXPENSES)
					.where("date", ">=", startTime)
					.get(),
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
			.filter(
				(doc: QueryDocumentSnapshot) =>
					doc.data().status === CREDIT_STATUSES.PENDING,
			)
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

		let updateData: any;

		// Use a transaction to prevent concurrent closure issues
		await db.runTransaction(async (transaction) => {
			const shiftDoc = await transaction.get(shiftRef);

			if (!shiftDoc.exists) {
				throw new Error("Shift not found");
			}

			const shiftData = shiftDoc.data();
			if (!shiftData) throw new Error("Shift data empty");

			if (shiftData.status === SHIFT_STATUSES.CLOSED) {
				throw new Error("Shift is already closed");
			}

			const expectedCash =
				(shiftData.opening_float || 0) +
				totalKenoNet +
				totalGameSales -
				totalExpenses -
				pendingCredits;
			const variance = Number(actualCashCounted) - expectedCash;

			if (
				Math.abs(variance) > VARIANCE_THRESHOLD_FOR_EXPLANATION &&
				!shortageReason
			) {
				throw new Error(
					"Variance is greater than $2.00. Please provide a reason for the shortage.",
				);
			}

			updateData = {
				end_time: new Date().toISOString(),
				actual_cash_counted: Number(actualCashCounted),
				expected_cash_calculated: expectedCash,
				variance: variance,
				reason_for_shortage: shortageReason || "",
				status: SHIFT_STATUSES.CLOSED,
			};

			transaction.update(shiftRef, updateData);
		});

		return res
			.status(200)
			.json({ message: "Shift closed successfully", data: updateData });
	} catch (error: unknown) {
		console.error("Error closing shift:", error);
		const err = error as Error;

		if (
			err.message === "Shift not found" ||
			err.message === "Shift data empty"
		) {
			return res.status(404).json({ error: err.message });
		}
		if (err.message === "Shift is already closed") {
			return res.status(400).json({ error: err.message });
		}
		if (err.message.includes("Variance is greater than $2.00")) {
			return res.status(400).json({ error: err.message });
		}

		return res.status(500).json({ error: "Internal server error" });
	}
};

export const updateFloat = async (req: AuthRequest, res: Response) => {
	const user = req.user;

	const { id } = req.params;
	const { floatAmount } = req.body;

	try {
		const shiftRef = db.collection(COLLECTIONS.SHIFTS).doc(id);
		const newFloat = parseFloat(floatAmount);

		await db.runTransaction(async (transaction) => {
			const shiftDoc = await transaction.get(shiftRef);

			if (!shiftDoc.exists) {
				throw new Error("Shift not found");
			}

			if (shiftDoc.data()?.status !== SHIFT_STATUSES.OPEN) {
				throw new Error("Only open shifts can have their float updated");
			}

			transaction.update(shiftRef, { opening_float: newFloat });

			const auditRef = db.collection(COLLECTIONS.AUDIT_LOGS).doc();
			transaction.set(auditRef, {
				action: "UPDATE",
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
		if (error instanceof Error) {
			if (error.message === "Shift not found") {
				return res.status(404).json({ error: error.message });
			}
			if (error.message === "Only open shifts can have their float updated") {
				return res.status(400).json({ error: error.message });
			}
		}
		return res.status(500).json({ error: "Internal server error" });
	}
};

export const getMissedData = async (req: AuthRequest, res: Response) => {
	try {
		await autoLabelStaleShifts();

		const missedShiftsSnap = await db
			.collection(COLLECTIONS.SHIFTS)
			.where("status", "==", SHIFT_STATUSES.MISSED)
			.get();
		const missedShifts = missedShiftsSnap.docs.map((doc) => ({
			id: doc.id,
			...doc.data(),
		}));

		const lastShiftSnap = await db
			.collection(COLLECTIONS.SHIFTS)
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
				.collection(COLLECTIONS.MISSED_DAY_RESOLUTIONS)
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
			await db.runTransaction(async (transaction) => {
				const openShiftsQuery = db
					.collection(COLLECTIONS.SHIFTS)
					.where("status", "==", SHIFT_STATUSES.OPEN);
				const openShiftsSnap = await transaction.get(openShiftsQuery);

				if (openShiftsSnap.empty) {
					const newDocRef = db.collection(COLLECTIONS.SHIFTS).doc();
					const auditRef = db.collection(COLLECTIONS.AUDIT_LOGS).doc();

					const user = req.user;
					const data = {
						manager_id: user?.uid || SYSTEM_IDENTITY.USER_ID,
						manager_name: user?.email || SYSTEM_IDENTITY.DISPLAY_NAME,
						start_time: new Date().toISOString(),
						opening_float: 0,
						status: SHIFT_STATUSES.OPEN,
					};

					transaction.set(newDocRef, data);
					transaction.set(auditRef, {
						action: "CREATE",
						table_affected: "shifts",
						record_id: newDocRef.id,
						old_value: null,
						new_value: data,
						reason_for_change: "Auto-opened shift for new day",
						user_id: user?.uid || SYSTEM_IDENTITY.USER_ID,
						timestamp: new Date().toISOString(),
					});

					newlyOpenedShift = { id: newDocRef.id, ...data };
				}
			});
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
