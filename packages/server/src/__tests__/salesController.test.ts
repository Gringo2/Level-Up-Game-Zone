import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
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
					const chainable: any = {
						get: vi.fn().mockResolvedValue({
							docs: [
								{
									id: "sale1",
									data: () => ({ game_name: "Pool", quantity_sold: 2 }),
								},
							],
						}),
						where: vi.fn().mockReturnThis(),
						orderBy: vi.fn().mockReturnThis(),
					};
					return chainable;
				}
				const defaultChainable: any = {
					get: vi.fn().mockResolvedValue({ docs: [] }),
					where: vi.fn().mockReturnThis(),
					orderBy: vi.fn().mockReturnThis(),
				};
				return defaultChainable;
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
				if (path === "users") {
					return {
						doc: vi.fn().mockReturnValue({
							get: vi.fn().mockResolvedValue({
								exists: true,
								data: () => ({ displayName: "Test User", role: "admin" }),
							}),
						}),
						// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
					} as any;
				}
				return {
					doc: vi.fn().mockReturnValue({ id: "new-sale-123" }),
					// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
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
				if (path === "users") {
					return {
						doc: vi.fn().mockReturnValue({
							get: vi.fn().mockResolvedValue({
								exists: true,
								data: () => ({ role: "admin" }),
							}),
						}),
						// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
					} as any;
				}
				return {
					doc: vi.fn().mockReturnValue({
						id: "sale-123",
						get: vi.fn().mockResolvedValue({
							id: "sale-123",
							data: () => ({
								game_name: "Pool",
								quantity_sold: 3,
								rate_applied: 10,
								calculated_total: 30,
							}),
						}),
					}),
					// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
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
				if (path === "users") {
					return {
						doc: vi.fn().mockReturnValue({
							get: vi.fn().mockResolvedValue({
								exists: true,
								data: () => ({ role: "admin" }),
							}),
						}),
						// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
					} as any;
				}
				return {
					doc: vi.fn().mockReturnValue({ id: "sale-123" }),
					// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
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
			expect(response.body.error).toContain(
				"Quantity sold must be greater than 0",
			);
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

		it("should return 400 when deleting sale with a too-short deleteReason (Zod)", async () => {
			const response = await request(app)
				.delete("/api/sales/sale-123")
				.set("Authorization", authHeader)
				.send({ deleteReason: "x" });

			expect(response.status).toBe(400);
			expect(response.body.error).toContain("at least 3 characters");
		});
	});

	describe("Not Found Contract (non-existent documents)", () => {
		const notFoundTransaction = () => {
			vi.mocked(db.collection).mockImplementation((path: string) => {
				if (path === "users") {
					return {
						doc: vi.fn().mockReturnValue({
							get: vi.fn().mockResolvedValue({
								exists: true,
								data: () => ({ role: "admin" }),
							}),
						}),
						// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
					} as any;
				}
				return {
					doc: vi.fn().mockReturnValue({ id: "missing-sale" }),
					// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				} as any;
			});
			vi.mocked(db.runTransaction).mockImplementationOnce(async (cb) => {
				const mockTx = {
					get: vi.fn().mockResolvedValue({
						exists: false,
						id: "missing-sale",
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

		it("returns 500 when updating a non-existent sale (documented contract)", async () => {
			notFoundTransaction();

			const response = await request(app)
				.put("/api/sales/missing-sale")
				.set("Authorization", authHeader)
				.send({ quantity_sold: 3, editReason: "Corrected figures" });

			expect(response.status).toBe(500);
			expect(response.body.error).toContain("Sale not found");
		});

		it("returns 500 when deleting a non-existent sale (documented contract)", async () => {
			notFoundTransaction();

			const response = await request(app)
				.delete("/api/sales/missing-sale")
				.set("Authorization", authHeader)
				.send({ deleteReason: "Removing stale record" });

			expect(response.status).toBe(500);
			expect(response.body.error).toContain("Sale not found");
		});
	});

	describe("Database Crash (500 fallback)", () => {
		const chainableCollection = () => {
			vi.mocked(db.collection).mockImplementation((path: string) => {
				if (path === "users") {
					return {
						doc: vi.fn().mockReturnValue({
							get: vi.fn().mockResolvedValue({
								exists: true,
								data: () => ({ role: "admin" }),
							}),
						}),
						// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
					} as any;
				}
				return {
					doc: vi.fn().mockReturnValue({ id: "sale-123" }),
					// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				} as any;
			});
		};

		it("returns 500 when listing sales crashes", async () => {
			vi.mocked(db.collection).mockImplementation((path: string) => {
				if (path === "game_sales_logs") {
					const chainable: any = {
						get: vi.fn().mockRejectedValue(new Error("DB crashed")),
						where: vi.fn().mockReturnThis(),
						orderBy: vi.fn().mockReturnThis(),
					};
					return chainable;
				}
				const defaultChainable: any = {
					get: vi.fn().mockResolvedValue({ docs: [] }),
					where: vi.fn().mockReturnThis(),
					orderBy: vi.fn().mockReturnThis(),
				};
				return defaultChainable;
			});

			const response = await request(app)
				.get("/api/sales")
				.set("Authorization", authHeader);

			expect(response.status).toBe(500);
			expect(response.body.error).toBe("DB crashed");
		});

		it("returns 500 when creating sale crashes inside the transaction", async () => {
			chainableCollection();
			vi.mocked(db.runTransaction).mockRejectedValueOnce(
				new Error("DB crashed"),
			);

			const response = await request(app)
				.post("/api/sales")
				.set("Authorization", authHeader)
				.send({
					game_name: "Pool",
					quantity_sold: 2,
					rate_applied: 10,
					calculated_total: 20,
				});

			expect(response.status).toBe(500);
			expect(response.body.error).toBe("Internal server error");
		});

		it("returns 500 when updating sale crashes inside the transaction", async () => {
			chainableCollection();
			vi.mocked(db.runTransaction).mockRejectedValueOnce(
				new Error("DB crashed"),
			);

			const response = await request(app)
				.put("/api/sales/sale-123")
				.set("Authorization", authHeader)
				.send({ quantity_sold: 3, editReason: "Corrected figures" });

			expect(response.status).toBe(500);
			expect(response.body.error).toContain("DB crashed");
		});

		it("returns 500 when deleting sale crashes inside the transaction", async () => {
			chainableCollection();
			vi.mocked(db.runTransaction).mockRejectedValueOnce(
				new Error("DB crashed"),
			);

			const response = await request(app)
				.delete("/api/sales/sale-123")
				.set("Authorization", authHeader)
				.send({ deleteReason: "Removing stale record" });

			expect(response.status).toBe(500);
			expect(response.body.error).toContain("DB crashed");
		});
	});

	describe("Unauthorized (missing credentials)", () => {
		it("returns 401 without a bearer token on GET", async () => {
			const response = await request(app).get("/api/sales");

			expect(response.status).toBe(401);
			expect(response.body.error).toContain("No token provided");
		});

		it("returns 401 without a bearer token on POST", async () => {
			const response = await request(app).post("/api/sales").send({
				game_name: "Pool",
				quantity_sold: 2,
				rate_applied: 10,
				calculated_total: 20,
			});

			expect(response.status).toBe(401);
		});

		it("returns 401 without a bearer token on DELETE", async () => {
			const response = await request(app)
				.delete("/api/sales/sale-123")
				.send({ deleteReason: "Removing stale record" });

			expect(response.status).toBe(401);
		});
	});
});
