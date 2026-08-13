import request from "supertest";
import { describe, expect, it, vi, beforeEach } from "vitest";
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
					} as any;
				}
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
								data: () => ({ role: "manager" }),
							}),
						}),
					} as any;
				}
				return {
					doc: vi.fn().mockReturnValue({ id: "new-exp-123" }),
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

		it("should successfully update an expense", async () => {
			vi.mocked(db.collection).mockImplementation((path: string) => {
				return {
					doc: vi.fn().mockReturnValue({ id: "exp-123" }),
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
	});
});
