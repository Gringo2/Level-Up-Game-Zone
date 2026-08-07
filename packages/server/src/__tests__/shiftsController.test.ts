import type { Response } from "express";
import { describe, expect, it, vi } from "vitest";
import { closeShift, startShift } from "../controllers/shiftsController.js";
import type { AuthRequest } from "../middleware/auth.js";

// Mock Firebase
vi.mock("../firebase.js", () => {
	const shiftData = {
		exists: true,
		data: () => ({
			status: "OPEN",
			start_time: "2026-08-01T10:00:00Z",
			opening_float: 100,
		}),
	};

	return {
		db: {
			collection: vi.fn().mockReturnThis(),
			doc: vi.fn().mockReturnThis(),
			get: vi.fn().mockResolvedValue(shiftData),
			where: vi.fn().mockReturnThis(),
			runTransaction: vi.fn().mockResolvedValue(true),
		},
	};
});

describe("Shifts Controller - Negative Tests", () => {
	it("startShift should return 401 if user is missing", async () => {
		const req = { body: { floatAmount: 100 } } as AuthRequest;
		const res = {
			status: vi.fn().mockReturnThis(),
			json: vi.fn(),
		} as unknown as Response;

		await startShift(req, res);

		expect(res.status).toHaveBeenCalledWith(401);
		expect(res.json).toHaveBeenCalledWith({ error: "Unauthorized" });
	});

	it("startShift should return 400 if floatAmount is missing", async () => {
		const req = {
			user: { uid: "user123" },
			body: {},
		} as unknown as AuthRequest;
		const res = {
			status: vi.fn().mockReturnThis(),
			json: vi.fn(),
		} as unknown as Response;

		await startShift(req, res);

		expect(res.status).toHaveBeenCalledWith(400);
		expect(res.json).toHaveBeenCalledWith({ error: "floatAmount is required" });
	});

	it("closeShift should return 400 if actualCashCounted is missing", async () => {
		const req = {
			params: { id: "shift123" },
			body: {},
		} as unknown as AuthRequest;
		const res = {
			status: vi.fn().mockReturnThis(),
			json: vi.fn(),
		} as unknown as Response;

		await closeShift(req, res);

		expect(res.status).toHaveBeenCalledWith(400);
		expect(res.json).toHaveBeenCalledWith({
			error: "actualCashCounted is required",
		});
	});

	it("closeShift should return 400 if variance > $2.00 and shortageReason is missing", async () => {
		// Mock dynamic get() for the dependencies to simulate expected cash
		const { db } = await import("../firebase.js");
		vi.mocked(db.collection).mockImplementation((path: string) => {
			if (path === "shifts") {
				return {
					doc: () => ({
						get: vi.fn().mockResolvedValue({
							exists: true,
							data: () => ({
								status: "OPEN",
								start_time: "2026-08-01T10:00:00Z",
								opening_float: 100, // expected cash base
							}),
						}),
					}),
					// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				} as any;
			}
			return {
				where: () => ({
					get: vi.fn().mockResolvedValue({ docs: [] }), // No sales, expected cash = 100
				}),
				// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
			} as any;
		});

		// Actual cash is 50, variance is -50, > $2.00 threshold
		const req = {
			params: { id: "shift123" },
			body: { actualCashCounted: 50 },
		} as unknown as AuthRequest;
		const res = {
			status: vi.fn().mockReturnThis(),
			json: vi.fn(),
		} as unknown as Response;

		await closeShift(req, res);

		expect(res.status).toHaveBeenCalledWith(400);
		expect(res.json).toHaveBeenCalledWith({
			error:
				"Variance is greater than $2.00. Please provide a reason for the shortage.",
		});
	});
});
