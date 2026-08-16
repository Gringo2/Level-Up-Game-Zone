import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import "./setupTests.js";
import app from "../app.js";

const { db } = await import("../firebase.js");

describe("Expenses Integration Tests", () => {
	const authHeader = "Bearer valid-mock-token";

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("Golden Path (Success Scenarios)", () => {
		it("should successfully list expenses", async () => {
			vi.mocked(db.collection).mockImplementation((path: string) => {
				if (path === "expenses") {
					return {
						get: vi.fn().mockResolvedValue({
							docs: [
								{
									id: "exp1",
									data: () => ({ description: "Supplies", amount: 20 }),
								},
							],
						}),
						// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
					} as any;
				}
				// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				return { get: vi.fn().mockResolvedValue({ docs: [] }) } as any;
			});

			const response = await request(app)
				.get("/api/expenses")
				.set("Authorization", authHeader);

			expect(response.status).toBe(200);
			expect(response.body).toHaveLength(1);
			expect(response.body[0].description).toBe("Supplies");
		});

		it("should successfully create an expense", async () => {
			vi.mocked(db.collection).mockImplementation((path: string) => {
				if (path === "users") {
					return {
						doc: () => ({
							get: vi.fn().mockResolvedValue({
								exists: true,
								data: () => ({ role: "admin" }),
							}),
						}),
						// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
					} as any;
				}
				return {
					doc: vi.fn().mockReturnValue({ id: "new-exp-123" }),
					// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				} as any;
			});

			const response = await request(app)
				.post("/api/expenses")
				.set("Authorization", authHeader)
				.send({ description: "Cleaning", amount: 15.5 });

			expect(response.status).toBe(201);
			expect(response.body.amount).toBe(15.5);
			expect(response.body.verified).toBe(true);
		});

		it("should successfully create an expense as staff (unverified)", async () => {
			vi.mocked(db.collection).mockImplementation((path: string) => {
				if (path === "users") {
					return {
						doc: () => ({
							get: vi.fn().mockResolvedValue({
								exists: false,
								data: () => undefined,
							}),
						}),
						// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
					} as any;
				}
				return {
					doc: vi.fn().mockReturnValue({ id: "staff-exp-456" }),
					// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				} as any;
			});

			const response = await request(app)
				.post("/api/expenses")
				.set("Authorization", authHeader)
				.send({ description: "Cleaning", amount: 15.5 });

			expect(response.status).toBe(201);
			expect(response.body.verified).toBe(false);
		});

		it("should successfully update an expense", async () => {
			vi.mocked(db.collection).mockImplementation((path: string) => {
				return {
					doc: vi.fn().mockReturnValue({ id: "exp-123" }),
					// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				} as any;
			});

			vi.mocked(db.runTransaction).mockImplementationOnce(async (cb) => {
				const mockTx = {
					get: vi.fn().mockResolvedValue({
						exists: true,
						id: "exp-123",
						data: () => ({ description: "Cleaning", amount: 15.5 }),
					}),
					set: vi.fn(),
					update: vi.fn(),
					delete: vi.fn(),
				};
				// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				return await cb(mockTx as any);
			});

			const response = await request(app)
				.put("/api/expenses/exp-123")
				.set("Authorization", authHeader)
				.send({ amount: 20, editReason: "Correction" });

			expect(response.status).toBe(200);
		});

		it("should successfully delete an expense", async () => {
			vi.mocked(db.collection).mockImplementation((path: string) => {
				return {
					doc: vi.fn().mockReturnValue({ id: "exp-123" }),
					// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				} as any;
			});

			vi.mocked(db.runTransaction).mockImplementationOnce(async (cb) => {
				const mockTx = {
					get: vi.fn().mockResolvedValue({
						exists: true,
						id: "exp-123",
						data: () => ({ description: "Cleaning", amount: 15.5 }),
					}),
					set: vi.fn(),
					update: vi.fn(),
					delete: vi.fn(),
				};
				// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				return await cb(mockTx as any);
			});

			const response = await request(app)
				.delete("/api/expenses/exp-123")
				.set("Authorization", authHeader)
				.send({ deleteReason: "Duplicate entry" });

			expect(response.status).toBe(200);
		});

		it("should successfully verify an expense", async () => {
			vi.mocked(db.collection).mockImplementation((path: string) => {
				return {
					doc: vi.fn().mockReturnValue({ id: "exp-123" }),
					// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				} as any;
			});

			vi.mocked(db.runTransaction).mockImplementationOnce(async (cb) => {
				const mockTx = {
					get: vi.fn().mockResolvedValue({
						exists: true,
						id: "exp-123",
						data: () => ({ description: "Cleaning", amount: 15.5 }),
					}),
					set: vi.fn(),
					update: vi.fn(),
					delete: vi.fn(),
				};
				// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				return await cb(mockTx as any);
			});

			const response = await request(app)
				.put("/api/expenses/exp-123/verify")
				.set("Authorization", authHeader);

			expect(response.status).toBe(200);
			expect(response.body.message).toBe("Verified successfully");
		});
	});

	describe("Negative Path (Rejection Scenarios)", () => {
		it("should return 400 when creating expense with negative amount (Zod)", async () => {
			const response = await request(app)
				.post("/api/expenses")
				.set("Authorization", authHeader)
				.send({ description: "Cleaning", amount: -10 });

			expect(response.status).toBe(400);
			expect(response.body.error).toContain("Amount must be greater than 0");
		});

		it("should return 400 when updating expense without editReason (Zod)", async () => {
			const response = await request(app)
				.put("/api/expenses/exp-123")
				.set("Authorization", authHeader)
				.send({ amount: 100 });

			expect(response.status).toBe(400);
			expect(response.body.error).toContain("Required");
		});

		it("should return 400 when deleting expense without deleteReason (Zod)", async () => {
			const response = await request(app)
				.delete("/api/expenses/exp-123")
				.set("Authorization", authHeader)
				.send({});

			expect(response.status).toBe(400);
			expect(response.body.error).toContain("Required");
		});

		it("should return 400 when deleting expense with a too-short deleteReason (Zod)", async () => {
			const response = await request(app)
				.delete("/api/expenses/exp-123")
				.set("Authorization", authHeader)
				.send({ deleteReason: "x" });

			expect(response.status).toBe(400);
			expect(response.body.error).toContain("at least 3 characters");
		});
	});

	describe("Not Found Contract (non-existent documents)", () => {
		const notFoundTransaction = () => {
			vi.mocked(db.runTransaction).mockImplementationOnce(async (cb) => {
				const mockTx = {
					get: vi.fn().mockResolvedValue({
						exists: false,
						id: "missing-expense",
						data: () => undefined,
					}),
					set: vi.fn(),
					update: vi.fn(),
					delete: vi.fn(),
				};
				// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				return await cb(mockTx as any);
			});
		};

		it("returns 500 when updating a non-existent expense (documented contract)", async () => {
			notFoundTransaction();

			const response = await request(app)
				.put("/api/expenses/missing-expense")
				.set("Authorization", authHeader)
				.send({ amount: 300, editReason: "Corrected figures" });

			expect(response.status).toBe(500);
			expect(response.body.error).toContain("Expense not found");
		});

		it("returns 500 when deleting a non-existent expense (documented contract)", async () => {
			notFoundTransaction();

			const response = await request(app)
				.delete("/api/expenses/missing-expense")
				.set("Authorization", authHeader)
				.send({ deleteReason: "Removing stale record" });

			expect(response.status).toBe(500);
			expect(response.body.error).toContain("Expense not found");
		});

		it("returns 500 when verifying a non-existent expense (documented contract)", async () => {
			notFoundTransaction();

			const response = await request(app)
				.put("/api/expenses/missing-expense/verify")
				.set("Authorization", authHeader);

			expect(response.status).toBe(500);
			expect(response.body.error).toContain("Expense not found");
		});
	});

	describe("Database Crash (500 fallback)", () => {
		const chainableCollection = () => {
			vi.mocked(db.collection).mockImplementation((path: string) => {
				if (path === "users") {
					return {
						doc: () => ({
							get: vi.fn().mockResolvedValue({
								exists: true,
								data: () => ({ role: "admin" }),
							}),
						}),
					} as any;
				}
				return {
					doc: vi.fn().mockReturnValue({ id: "exp-123" }),
					// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				} as any;
			});
		};

		it("returns 500 when listing expenses crashes", async () => {
			vi.mocked(db.collection).mockImplementation((path: string) => {
				if (path === "expenses") {
					return {
						get: vi.fn().mockRejectedValue(new Error("DB crashed")),
						// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
					} as any;
				}
				// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				return { get: vi.fn().mockResolvedValue({ docs: [] }) } as any;
			});

			const response = await request(app)
				.get("/api/expenses")
				.set("Authorization", authHeader);

			expect(response.status).toBe(500);
			expect(response.body.error).toBe("DB crashed");
		});

		it("returns 500 when creating expense crashes inside the transaction", async () => {
			chainableCollection();
			vi.mocked(db.runTransaction).mockRejectedValueOnce(
				new Error("DB crashed"),
			);

			const response = await request(app)
				.post("/api/expenses")
				.set("Authorization", authHeader)
				.send({ description: "Cleaning", amount: 15.5 });

			expect(response.status).toBe(500);
			expect(response.body.error).toBe("Internal server error");
		});

		it("returns 500 when updating expense crashes inside the transaction", async () => {
			chainableCollection();
			vi.mocked(db.runTransaction).mockRejectedValueOnce(
				new Error("DB crashed"),
			);

			const response = await request(app)
				.put("/api/expenses/exp-123")
				.set("Authorization", authHeader)
				.send({ amount: 300, editReason: "Corrected figures" });

			expect(response.status).toBe(500);
			expect(response.body.error).toContain("DB crashed");
		});

		it("returns 500 when deleting expense crashes inside the transaction", async () => {
			chainableCollection();
			vi.mocked(db.runTransaction).mockRejectedValueOnce(
				new Error("DB crashed"),
			);

			const response = await request(app)
				.delete("/api/expenses/exp-123")
				.set("Authorization", authHeader)
				.send({ deleteReason: "Removing stale record" });

			expect(response.status).toBe(500);
			expect(response.body.error).toContain("DB crashed");
		});

		it("returns 500 when verifying expense crashes inside the transaction", async () => {
			chainableCollection();
			vi.mocked(db.runTransaction).mockRejectedValueOnce(
				new Error("DB crashed"),
			);

			const response = await request(app)
				.put("/api/expenses/exp-123/verify")
				.set("Authorization", authHeader);

			expect(response.status).toBe(500);
			expect(response.body.error).toContain("DB crashed");
		});
	});

	describe("Unauthorized (missing credentials)", () => {
		it("returns 401 without a bearer token on GET", async () => {
			const response = await request(app).get("/api/expenses");

			expect(response.status).toBe(401);
			expect(response.body.error).toContain("No token provided");
		});

		it("returns 401 without a bearer token on POST", async () => {
			const response = await request(app)
				.post("/api/expenses")
				.send({ description: "Cleaning", amount: 15.5 });

			expect(response.status).toBe(401);
		});

		it("returns 401 without a bearer token on DELETE", async () => {
			const response = await request(app)
				.delete("/api/expenses/exp-123")
				.send({ deleteReason: "Removing stale record" });

			expect(response.status).toBe(401);
		});
	});
});
