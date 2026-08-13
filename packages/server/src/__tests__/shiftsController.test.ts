import request from "supertest";
import { describe, expect, it, vi, beforeEach } from "vitest";
import "./setupTests.js";
import app from "../app.js";

const { db } = await import("../firebase.js");

describe("Shifts Integration Tests", () => {
	const authHeader = "Bearer valid-mock-token";

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("Golden Path (Success Scenarios)", () => {
		it("should successfully open a new shift", async () => {
			vi.mocked(db.collection).mockImplementation((path: string) => {
				if (path === "shifts") {
					return {
						where: vi.fn().mockReturnThis(),
						get: vi.fn().mockResolvedValue({ empty: true, docs: [] }),
						doc: vi.fn().mockReturnValue({ id: "new-shift-123" }),
					} as any;
				}
				return { doc: vi.fn().mockReturnValue({ id: "audit-123" }) } as any;
			});

			const response = await request(app)
				.post("/api/shifts")
				.set("Authorization", authHeader)
				.send({ floatAmount: 150, managerName: "Test Manager" });

			expect(response.status).toBe(201);
		});

		it("should successfully update an opening float on an OPEN shift", async () => {
			const response = await request(app)
				.put("/api/shifts/shift-123/float")
				.set("Authorization", authHeader)
				.send({ floatAmount: 200 });

			expect(response.status).toBe(200);
		});

		it("should successfully close a shift with valid variance calculation", async () => {
			vi.mocked(db.collection).mockImplementation((path: string) => {
				if (path === "shifts") {
					return {
						doc: () => ({
							get: vi.fn().mockResolvedValue({
								exists: true,
								data: () => ({
									status: "OPEN",
									start_time: "2026-08-01T10:00:00Z",
									opening_float: 100,
								}),
							}),
							update: vi.fn(),
						}),
					} as any;
				}
				return {
					where: vi.fn().mockReturnThis(),
					get: vi.fn().mockResolvedValue({ docs: [] }),
				} as any;
			});

			const response = await request(app)
				.post("/api/shifts/shift-123/close")
				.set("Authorization", authHeader)
				.send({ actualCashCounted: 100 });

			expect(response.status).toBe(200);
		});

		it("should auto-generate a new OPEN shift in getMissedData if no gaps exist (M-29 behavior)", async () => {
			vi.mocked(db.collection).mockImplementation((path: string) => {
				if (path === "shifts") {
					return {
						where: vi.fn().mockReturnThis(),
						orderBy: vi.fn().mockReturnThis(),
						limit: vi.fn().mockReturnThis(),
						get: vi.fn().mockResolvedValue({ empty: true, docs: [] }),
						doc: vi.fn().mockReturnValue({ id: "auto-opened-123" }),
					} as any;
				}
				return { doc: vi.fn().mockReturnValue({ id: "audit" }) } as any;
			});

			// Override runTransaction specifically to yield empty for the openShiftsQuery
			vi.mocked(db.runTransaction).mockImplementationOnce(async (cb) => {
				const mockTx = {
					get: vi.fn().mockResolvedValue({ empty: true }),
					set: vi.fn(),
					update: vi.fn(),
					delete: vi.fn(),
				};
				// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				return await cb(mockTx as any);
			});

			const response = await request(app)
				.get("/api/shifts/missed")
				.set("Authorization", authHeader);

			expect(response.status).toBe(200);
			expect(response.body.newlyOpenedShift).toMatchObject({
				id: "auto-opened-123",
				status: "OPEN",
			});
		});
	});

	describe("Negative Path (Rejection Scenarios)", () => {
		it("should return 401 if authorization header is missing", async () => {
			const response = await request(app)
				.post("/api/shifts")
				.send({ floatAmount: 100 });
			expect(response.status).toBe(401);
		});

		it("should return 400 when floatAmount is negative on shift start (Zod Validation)", async () => {
			const response = await request(app)
				.post("/api/shifts")
				.set("Authorization", authHeader)
				.send({ floatAmount: -50 });
			expect(response.status).toBe(400);
		});

		it("should return 400 when floatAmount is missing on updateFloat (Zod Validation)", async () => {
			const response = await request(app)
				.put("/api/shifts/shift-123/float")
				.set("Authorization", authHeader)
				.send({}); 
			expect(response.status).toBe(400);
			expect(response.body.error).toContain("Float amount must be a valid number");
		});

		it("should return 400 if closing a shift with > $2 variance without a reason", async () => {
			// Provide the necessary mock so closeShift can fetch dependencies
			vi.mocked(db.collection).mockImplementation((path: string) => {
				if (path === "shifts") {
					return {
						doc: () => ({
							get: vi.fn().mockResolvedValue({
								exists: true,
								data: () => ({
									status: "OPEN",
									start_time: "2026-08-01T10:00:00Z",
									opening_float: 100,
								}),
							}),
							update: vi.fn(),
						}),
					} as any;
				}
				return {
					where: vi.fn().mockReturnThis(),
					get: vi.fn().mockResolvedValue({ docs: [] }),
				} as any;
			});

			const response = await request(app)
				.post("/api/shifts/shift-123/close")
				.set("Authorization", authHeader)
				.send({ actualCashCounted: 50 }); // Variance = 50

			expect(response.status).toBe(400);
			expect(response.body.error).toContain("Variance is greater than $2.00");
		});
	});
});

