import request from "supertest";
import { describe, expect, it, vi, beforeEach } from "vitest";
import "./setupTests.js";
import app from "../app.js";

const { db } = await import("../firebase.js");

describe("Sales Integration Tests", () => {
	const authHeader = "Bearer valid-mock-token";

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("Golden Path (Success Scenarios)", () => {
		it("should successfully list sales", async () => {
			vi.mocked(db.collection).mockImplementation((path: string) => {
				if (path === "game_sales_logs") {
					return {
						get: vi.fn().mockResolvedValue({
							docs: [
								{
									id: "sale1",
									data: () => ({ game_name: "Pool", quantity_sold: 2 }),
								},
							],
						}),
					} as any;
				}
				return { get: vi.fn().mockResolvedValue({ docs: [] }) } as any;
			});

			const response = await request(app)
				.get("/api/sales")
				.set("Authorization", authHeader);

			expect(response.status).toBe(200);
			expect(response.body).toHaveLength(1);
			expect(response.body[0].game_name).toBe("Pool");
		});

		it("should successfully create a sale", async () => {
			vi.mocked(db.collection).mockImplementation((path: string) => {
				return {
					doc: vi.fn().mockReturnValue({ id: "new-sale-123" }),
				} as any;
			});

			const response = await request(app)
				.post("/api/sales")
				.set("Authorization", authHeader)
				.send({
					game_name: "Pool",
					quantity_sold: 2,
					rate_applied: 10,
					calculated_total: 20,
				});

			expect(response.status).toBe(201);
			expect(response.body.calculated_total).toBe(20);
		});

		it("should successfully update a sale", async () => {
			vi.mocked(db.collection).mockImplementation((path: string) => {
				return {
					doc: vi.fn().mockReturnValue({ id: "sale-123" }),
				} as any;
			});

			vi.mocked(db.runTransaction).mockImplementationOnce(async (cb) => {
				const mockTx = {
					get: vi.fn().mockResolvedValue({
						exists: true,
						id: "sale-123",
						data: () => ({ game_name: "Pool", quantity_sold: 2 }),
					}),
					set: vi.fn(),
					update: vi.fn(),
					delete: vi.fn(),
				};
				// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				return await cb(mockTx as any);
			});

			const response = await request(app)
				.put("/api/sales/sale-123")
				.set("Authorization", authHeader)
				.send({ quantity_sold: 3, editReason: "Corrected qty" });

			expect(response.status).toBe(200);
		});

		it("should successfully delete a sale", async () => {
			vi.mocked(db.collection).mockImplementation((path: string) => {
				return {
					doc: vi.fn().mockReturnValue({ id: "sale-123" }),
				} as any;
			});

			vi.mocked(db.runTransaction).mockImplementationOnce(async (cb) => {
				const mockTx = {
					get: vi.fn().mockResolvedValue({
						exists: true,
						id: "sale-123",
						data: () => ({ game_name: "Pool", quantity_sold: 2 }),
					}),
					set: vi.fn(),
					update: vi.fn(),
					delete: vi.fn(),
				};
				// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				return await cb(mockTx as any);
			});

			const response = await request(app)
				.delete("/api/sales/sale-123")
				.set("Authorization", authHeader)
				.send({ deleteReason: "Duplicate" });

			expect(response.status).toBe(200);
		});
	});

	describe("Negative Path (Rejection Scenarios)", () => {
		it("should return 400 when creating sale with negative quantity (Zod)", async () => {
			const response = await request(app)
				.post("/api/sales")
				.set("Authorization", authHeader)
				.send({
					game_name: "Pool",
					quantity_sold: -5,
					rate_applied: 10,
					calculated_total: -50,
				});

			expect(response.status).toBe(400);
			expect(response.body.error).toContain("Quantity sold must be greater than 0");
		});

		it("should return 400 when updating sale without editReason (Zod)", async () => {
			const response = await request(app)
				.put("/api/sales/sale-123")
				.set("Authorization", authHeader)
				.send({ quantity_sold: 3 }); 

			expect(response.status).toBe(400);
			expect(response.body.error).toContain("Required");
		});

		it("should return 400 when deleting sale without deleteReason (Zod)", async () => {
			const response = await request(app)
				.delete("/api/sales/sale-123")
				.set("Authorization", authHeader)
				.send({}); 

			expect(response.status).toBe(400);
			expect(response.body.error).toContain("Required");
		});
	});
});
