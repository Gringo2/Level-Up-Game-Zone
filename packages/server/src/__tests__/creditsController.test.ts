import request from "supertest";
import { describe, expect, it, vi, beforeEach } from "vitest";
import "./setupTests.js";
import app from "../app.js";

const { db } = await import("../firebase.js");

describe("Credits Integration Tests", () => {
	const authHeader = "Bearer valid-mock-token";

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("Golden Path (Success Scenarios)", () => {
		it("should successfully list credits", async () => {
			vi.mocked(db.collection).mockImplementation((path: string) => {
				if (path === "credits") {
					return {
						get: vi.fn().mockResolvedValue({
							docs: [
								{
									id: "credit1",
									data: () => ({ employee_name: "John Doe", amount: 10 }),
								},
							],
						}),
					} as any;
				}
				return { get: vi.fn().mockResolvedValue({ docs: [] }) } as any;
			});

			const response = await request(app)
				.get("/api/credits")
				.set("Authorization", authHeader);

			expect(response.status).toBe(200);
			expect(response.body).toHaveLength(1);
			expect(response.body[0].employee_name).toBe("John Doe");
		});

		it("should successfully create a credit", async () => {
			vi.mocked(db.collection).mockImplementation((path: string) => {
				return {
					doc: vi.fn().mockReturnValue({ id: "new-credit-123" }),
				} as any;
			});

			const response = await request(app)
				.post("/api/credits")
				.set("Authorization", authHeader)
				.send({ employee_name: "John Doe", amount: 50, reason: "Advance" });

			expect(response.status).toBe(201);
			expect(response.body.amount).toBe(50);
		});

		it("should successfully update a credit", async () => {
			vi.mocked(db.collection).mockImplementation((path: string) => {
				return {
					doc: vi.fn().mockReturnValue({ id: "credit-123" }),
				} as any;
			});

			vi.mocked(db.runTransaction).mockImplementationOnce(async (cb) => {
				const mockTx = {
					get: vi.fn().mockResolvedValue({
						exists: true,
						id: "credit-123",
						data: () => ({ employee_name: "John", amount: 50 }),
					}),
					set: vi.fn(),
					update: vi.fn(),
					delete: vi.fn(),
				};
				// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				return await cb(mockTx as any);
			});

			const response = await request(app)
				.put("/api/credits/credit-123")
				.set("Authorization", authHeader)
				.send({ amount: 75, editReason: "Increased amount" });

			expect(response.status).toBe(200);
		});

		it("should successfully delete a credit", async () => {
			vi.mocked(db.collection).mockImplementation((path: string) => {
				return {
					doc: vi.fn().mockReturnValue({ id: "credit-123" }),
				} as any;
			});

			vi.mocked(db.runTransaction).mockImplementationOnce(async (cb) => {
				const mockTx = {
					get: vi.fn().mockResolvedValue({
						exists: true,
						id: "credit-123",
						data: () => ({ employee_name: "John", amount: 50 }),
					}),
					set: vi.fn(),
					update: vi.fn(),
					delete: vi.fn(),
				};
				// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				return await cb(mockTx as any);
			});

			const response = await request(app)
				.delete("/api/credits/credit-123")
				.set("Authorization", authHeader)
				.send({ deleteReason: "Mistake" });

			expect(response.status).toBe(200);
		});
	});

	describe("Negative Path (Rejection Scenarios)", () => {
		it("should return 400 when creating credit with missing employee_name (Zod)", async () => {
			const response = await request(app)
				.post("/api/credits")
				.set("Authorization", authHeader)
				.send({ amount: 50 }); // missing employee_name

			expect(response.status).toBe(400);
			expect(response.body.error).toContain("Required");
		});

		it("should return 400 when updating credit without editReason (Controller Logic)", async () => {
			const response = await request(app)
				.put("/api/credits/credit-123")
				.set("Authorization", authHeader)
				.send({ amount: 100 }); // missing editReason

			expect(response.status).toBe(400);
			expect(response.body.error).toBe("Edit reason is required");
		});

		it("should return 400 when deleting credit without deleteReason (Zod)", async () => {
			const response = await request(app)
				.delete("/api/credits/credit-123")
				.set("Authorization", authHeader)
				.send({}); // missing deleteReason

			expect(response.status).toBe(400);
			expect(response.body.error).toContain("Required");
		});
	});
});
