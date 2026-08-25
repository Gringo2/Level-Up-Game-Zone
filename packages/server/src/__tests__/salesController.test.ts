import { COLLECTIONS } from "@level-up/shared";
import { FieldValue } from "firebase-admin/firestore";
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
					// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore query chains requires any
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
				// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore query chains requires any
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

		it("TD-026: returns 400 when the referenced game rate does not exist", async () => {
			vi.mocked(db.collection).mockImplementation((path: string) => {
				if (path === "users") {
					return {
						doc: vi.fn().mockReturnValue({
							get: vi.fn().mockResolvedValue({
								exists: true,
								data: () => ({ displayName: "Test User" }),
							}),
						}),
						// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
					} as any;
				}
				if (path === "game_rates") {
					return {
						doc: () => ({
							get: vi.fn().mockResolvedValue({ exists: false }),
						}),
						// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
					} as any;
				}
				return {
					doc: vi.fn().mockReturnValue({ id: "x" }),
					// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				} as any;
			});

			const response = await request(app)
				.post("/api/sales")
				.set("Authorization", authHeader)
				.send({
					game_id: "bogus-rate",
					game_name: "Ghost Game",
					quantity_sold: 2,
					rate_applied: 5,
				});

			expect(response.status).toBe(400);
			expect(response.body.error).toBe("Invalid game");
		});

		it("TD-026/TD-035: returns 400 when game_id is missing (Zod)", async () => {
			const response = await request(app)
				.post("/api/sales")
				.set("Authorization", authHeader)
				.send({
					game_name: "Pool",
					quantity_sold: 2,
					rate_applied: 5,
				});

			expect(response.status).toBe(400);
			expect(response.body.error).toContain("Game selection is required");
		});

		it("filters sales server-side when a date range is provided", async () => {
			const range: { start?: string; end?: string } = {};
			vi.mocked(db.collection).mockImplementation((path: string) => {
				if (path !== COLLECTIONS.GAME_SALES_LOGS) {
					return {
						doc: () => ({
							get: vi.fn().mockResolvedValue({ exists: false }),
						}),
						// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
					} as any;
				}
				// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore query chains requires any
				const chainable: any = {
					get: vi.fn().mockImplementation(() => {
						const docs = [
							{
								id: "in-range",
								data: () => ({
									game_name: "Pool",
									date: "2026-08-03T18:00:00.000Z",
								}),
							},
							{
								id: "out-of-range",
								data: () => ({
									game_name: "PS4",
									date: "2026-09-10T18:00:00.000Z",
								}),
							},
						].filter((doc) => {
							const date = doc.data().date as string;
							return (
								(!range.start || date >= range.start) &&
								(!range.end || date <= range.end)
							);
						});
						return Promise.resolve({ docs });
					}),
					where: vi.fn((_field: string, op: string, value: string) => {
						if (op === ">=") range.start = value;
						if (op === "<=") range.end = value;
						return chainable;
					}),
					orderBy: vi.fn().mockReturnThis(),
				};
				return chainable;
			});

			const startISO = "2026-08-01T00:00:00.000Z";
			const endISO = "2026-08-07T23:59:59.999Z";
			const response = await request(app)
				.get("/api/sales")
				.query({ startDate: startISO, endDate: endISO })
				.set("Authorization", authHeader);

			expect(response.status).toBe(200);
			expect(response.body.map((row: { id: string }) => row.id)).toEqual([
				"in-range",
			]);
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
				if (path === "game_rates") {
					return {
						doc: () => ({
							get: vi.fn().mockResolvedValue({
								exists: true,
								data: () => ({
									game_name: "Pool",
									price_per_unit: 5,
								}),
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
					game_id: "rate-1",
					game_name: "Pool",
					quantity_sold: 2,
					rate_applied: 999,
					calculated_total: 99999,
				});

			expect(response.status).toBe(201);
			expect(response.body.rate_applied).toBe(5);
			expect(response.body.calculated_total).toBe(10);
		});

		it("should successfully update a sale with server-authoritative math", async () => {
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
				if (path === "game_rates") {
					return {
						doc: () => ({
							get: vi.fn().mockResolvedValue({
								exists: true,
								data: () => ({ game_name: "Pool", price_per_unit: 5 }),
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
								game_id: "rate-1",
								game_name: "Pool",
								quantity_sold: 3,
								rate_applied: 5,
								calculated_total: 15,
							}),
						}),
					}),
					// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				} as any;
			});

			let capturedUpdate: Record<string, unknown> | undefined;
			vi.mocked(db.runTransaction).mockImplementationOnce(async (cb) => {
				const mockTx = {
					get: vi.fn().mockResolvedValue({
						exists: true,
						id: "sale-123",
						data: () => ({
							game_id: "rate-1",
							game_name: "Pool",
							quantity_sold: 2,
						}),
					}),
					set: vi.fn(),
					update: vi.fn((_ref: unknown, payload: Record<string, unknown>) => {
						capturedUpdate = payload;
					}),
					delete: vi.fn(),
				};
				// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				return await cb(mockTx as any);
			});

			const response = await request(app)
				.put("/api/sales/sale-123")
				.set("Authorization", authHeader)
				.send({
					game_id: "rate-1",
					quantity_sold: 3,
					calculated_total: 99999,
					editReason: "Corrected qty",
				});

			expect(response.status).toBe(200);
			expect(capturedUpdate).toBeDefined();
			expect(capturedUpdate?.rate_applied).toBe(5);
			expect(capturedUpdate?.calculated_total).toBe(15);
			expect(response.body.calculated_total).toBe(15);
			expect(response.body.rate_applied).toBe(5);
		});

		it("TD-026 A1: returns 400 when editing references a nonexistent rate", async () => {
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
				if (path === "game_rates") {
					return {
						doc: () => ({
							get: vi.fn().mockResolvedValue({ exists: false }),
						}),
						// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
					} as any;
				}
				return {
					doc: vi.fn().mockReturnValue({
						id: "sale-123",
						get: vi.fn().mockResolvedValue({
							exists: true,
							data: () => ({ game_id: "rate-x", quantity_sold: 2 }),
						}),
					}),
					// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				} as any;
			});

			vi.mocked(db.runTransaction).mockImplementationOnce(async (cb) => {
				const mockTx = {
					get: vi.fn().mockResolvedValue({
						exists: true,
						data: () => ({ game_id: "rate-x", quantity_sold: 2 }),
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
				.send({ game_id: "ghost", editReason: "retarget" });

			expect(response.status).toBe(400);
			expect(response.body.error).toBe("Invalid game");
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
					game_id: "rate-1",
					game_name: "Pool",
					quantity_sold: -5,
					rate_applied: 10,
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
					// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore query chains requires any
					const chainable: any = {
						get: vi.fn().mockRejectedValue(new Error("DB crashed")),
						where: vi.fn().mockReturnThis(),
						orderBy: vi.fn().mockReturnThis(),
					};
					return chainable;
				}
				// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore query chains requires any
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
			expect(response.body.error).toBe("Internal server error");
		});

		it("does not leak internal error details to clients", async () => {
			vi.mocked(db.collection).mockImplementation((path: string) => {
				if (path === "game_sales_logs") {
					// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore query chains requires any
					const chainable: any = {
						get: vi
							.fn()
							.mockRejectedValue(
								new Error(
									"permission denied: projects/secret/documents/game_sales_logs",
								),
							),
						where: vi.fn().mockReturnThis(),
						orderBy: vi.fn().mockReturnThis(),
					};
					return chainable;
				}
				// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore query chains requires any
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
			expect(response.body.error).toBe("Internal server error");
			expect(response.body.error).not.toContain("projects/secret");
		});

		it("returns 500 when creating sale crashes inside the transaction", async () => {
			vi.mocked(db.collection).mockImplementation((path: string) => {
				if (path === "users") {
					return {
						doc: vi.fn().mockReturnValue({
							get: vi.fn().mockResolvedValue({
								exists: true,
								data: () => ({ displayName: "Test User" }),
							}),
						}),
						// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
					} as any;
				}
				if (path === "game_rates") {
					return {
						doc: () => ({
							get: vi.fn().mockResolvedValue({
								exists: true,
								data: () => ({ game_name: "Pool", price_per_unit: 5 }),
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
			vi.mocked(db.runTransaction).mockRejectedValueOnce(
				new Error("DB crashed"),
			);

			const response = await request(app)
				.post("/api/sales")
				.set("Authorization", authHeader)
				.send({
					game_id: "rate-1",
					game_name: "Pool",
					quantity_sold: 2,
					rate_applied: 10,
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
			expect(response.body.error).toBe("Internal server error");
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
			expect(response.body.error).toBe("Internal server error");
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

	describe("ACP-008: TD-051 verification workflow + TD-052 unit_type persistence", () => {
		const authHeader = "Bearer valid-mock-token";

		const baseCollections = (
			rateData: Record<string, unknown> | { exists: false },
		) => {
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
				if (path === "game_rates") {
					return {
						doc: () => ({
							get: vi
								.fn()
								.mockResolvedValue(
									"exists" in rateData && rateData.exists === false
										? { exists: false }
										: { exists: true, data: () => rateData },
								),
						}),
						// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
					} as any;
				}
				return {
					doc: vi.fn().mockReturnValue({
						id: "new-sale-123",
						get: vi.fn().mockResolvedValue({
							id: "sale-123",
							data: () => ({ game_id: "rate-1", quantity_sold: 4 }),
						}),
					}),
					// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				} as any;
			});
		};

		it("TD-052: persists server-authoritative unit_type from the rate doc, ignoring client-supplied values", async () => {
			baseCollections({
				game_name: "PS4",
				price_per_unit: 5,
				unit_type: "Hour",
			});

			let createdPayload: Record<string, unknown> | undefined;
			vi.mocked(db.runTransaction).mockImplementationOnce(async (cb) => {
				const mockTx = {
					get: vi.fn(),
					set: vi.fn((_ref: unknown, payload: Record<string, unknown>) => {
						if (payload.action !== "CREATE") createdPayload = payload;
					}),
					update: vi.fn(),
					delete: vi.fn(),
				};
				// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				return await cb(mockTx as any);
			});

			const response = await request(app)
				.post("/api/sales")
				.set("Authorization", authHeader)
				.send({
					game_id: "rate-1",
					game_name: "PS4",
					quantity_sold: 2,
					rate_applied: 999,
					unit_type: "Bogus",
				});

			expect(response.status).toBe(201);
			expect(response.body.unit_type).toBe("Hour");
			expect(createdPayload?.unit_type).toBe("Hour");
		});

		it("TD-052: legacy rate without unit_type omits the key rather than writing undefined", async () => {
			baseCollections({ game_name: "Pool", price_per_unit: 2 });

			let createdPayload: Record<string, unknown> | undefined;
			vi.mocked(db.runTransaction).mockImplementationOnce(async (cb) => {
				const mockTx = {
					get: vi.fn(),
					set: vi.fn((_ref: unknown, payload: Record<string, unknown>) => {
						if (payload.action !== "CREATE") createdPayload = payload;
					}),
					update: vi.fn(),
					delete: vi.fn(),
				};
				// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				return await cb(mockTx as any);
			});

			const response = await request(app)
				.post("/api/sales")
				.set("Authorization", authHeader)
				.send({
					game_id: "rate-1",
					game_name: "Pool",
					quantity_sold: 3,
					rate_applied: 2,
				});

			expect(response.status).toBe(201);
			expect(createdPayload).toBeDefined();
			expect(
				Object.hasOwn(createdPayload as Record<string, unknown>, "unit_type"),
			).toBe(false);
		});

		it("TD-052: update converges stored unit_type to the effective rate's value", async () => {
			baseCollections({
				game_name: "Pool",
				price_per_unit: 2,
				unit_type: "Game",
			});

			let capturedUpdate: Record<string, unknown> | undefined;
			vi.mocked(db.runTransaction).mockImplementationOnce(async (cb) => {
				const mockTx = {
					get: vi.fn().mockResolvedValue({
						exists: true,
						id: "sale-123",
						data: () => ({
							game_id: "rate-1",
							game_name: "Pool",
							quantity_sold: 2,
							unit_type: "Hour",
						}),
					}),
					set: vi.fn(),
					update: vi.fn((_ref: unknown, payload: Record<string, unknown>) => {
						capturedUpdate = payload;
					}),
					delete: vi.fn(),
				};
				// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				return await cb(mockTx as any);
			});

			const response = await request(app)
				.put("/api/sales/sale-123")
				.set("Authorization", authHeader)
				.send({ quantity_sold: 4, editReason: "Corrected quantity" });

			expect(response.status).toBe(200);
			expect(capturedUpdate?.unit_type).toBe("Game");
		});

		it("TD-052: update against a legacy rate clears stale unit_type on edit", async () => {
			baseCollections({ game_name: "Pool", price_per_unit: 2 });

			let capturedUpdate: Record<string, unknown> | undefined;
			vi.mocked(db.runTransaction).mockImplementationOnce(async (cb) => {
				const mockTx = {
					get: vi.fn().mockResolvedValue({
						exists: true,
						id: "sale-123",
						data: () => ({
							game_id: "rate-1",
							game_name: "Pool",
							quantity_sold: 2,
							unit_type: "Hour",
						}),
					}),
					set: vi.fn(),
					update: vi.fn((_ref: unknown, payload: Record<string, unknown>) => {
						capturedUpdate = payload;
					}),
					delete: vi.fn(),
				};
				// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				return await cb(mockTx as any);
			});

			const response = await request(app)
				.put("/api/sales/sale-123")
				.set("Authorization", authHeader)
				.send({ quantity_sold: 4, editReason: "Corrected quantity" });

			expect(response.status).toBe(200);
			expect(capturedUpdate?.unit_type).toEqual(FieldValue.delete());
		});

		it("TD-052: audit new_value stays Firestore-legal (no delete sentinel) on legacy-rate edit", async () => {
			baseCollections({ game_name: "Pool", price_per_unit: 2 });

			let capturedAudit: Record<string, unknown> | undefined;
			vi.mocked(db.runTransaction).mockImplementationOnce(async (cb) => {
				const mockTx = {
					get: vi.fn().mockResolvedValue({
						exists: true,
						id: "sale-123",
						data: () => ({
							game_id: "rate-1",
							game_name: "Pool",
							quantity_sold: 2,
							unit_type: "Hour",
						}),
					}),
					set: vi.fn((_ref: unknown, payload: Record<string, unknown>) => {
						if (payload.action === "UPDATE") capturedAudit = payload;
					}),
					update: vi.fn(),
					delete: vi.fn(),
				};
				// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				return await cb(mockTx as any);
			});

			const response = await request(app)
				.put("/api/sales/sale-123")
				.set("Authorization", authHeader)
				.send({ quantity_sold: 4, editReason: "Corrected quantity" });

			expect(response.status).toBe(200);
			expect(capturedAudit).toBeDefined();
			expect(
				Object.hasOwn(
					capturedAudit?.new_value as Record<string, unknown>,
					"unit_type",
				),
			).toBe(false);
		});

		it("TD-051: verifies a sale transactionally with an audit record", async () => {
			baseCollections({ exists: false });

			let capturedUpdate: Record<string, unknown> | undefined;
			let capturedAudit: Record<string, unknown> | undefined;
			vi.mocked(db.runTransaction).mockImplementationOnce(async (cb) => {
				const mockTx = {
					get: vi.fn().mockResolvedValue({
						exists: true,
						id: "sale-123",
						data: () => ({ game_name: "Pool", calculated_total: 10 }),
					}),
					set: vi.fn((_ref: unknown, payload: Record<string, unknown>) => {
						capturedAudit = payload;
					}),
					update: vi.fn((_ref: unknown, payload: Record<string, unknown>) => {
						capturedUpdate = payload;
					}),
					delete: vi.fn(),
				};
				// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				return await cb(mockTx as any);
			});

			const response = await request(app)
				.put("/api/sales/sale-123/verify")
				.set("Authorization", authHeader);

			expect(response.status).toBe(200);
			expect(response.body.message).toBe("Verified successfully");
			expect(capturedUpdate).toEqual({ verified: true });
			expect(capturedAudit?.table_affected).toBe("game_sales_logs");
			expect(capturedAudit?.action).toBe("UPDATE");
		});

		it("TD-051: returns 500 when verifying a non-existent sale (documented contract)", async () => {
			baseCollections({ exists: false });

			vi.mocked(db.runTransaction).mockImplementationOnce(async (cb) => {
				const mockTx = {
					get: vi.fn().mockResolvedValue({
						exists: false,
						data: () => undefined,
					}),
					set: vi.fn(),
					update: vi.fn(),
					delete: vi.fn(),
				};
				// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				return await cb(mockTx as any);
			});

			const response = await request(app)
				.put("/api/sales/missing-sale/verify")
				.set("Authorization", authHeader);

			expect(response.status).toBe(500);
			expect(response.body.error).toContain("Sale not found");
		});

		it("TD-051: staff cannot verify sales (manager/admin gated)", async () => {
			vi.mocked(db.collection).mockImplementation((path: string) => {
				if (path === "users") {
					return {
						doc: vi.fn().mockReturnValue({
							get: vi.fn().mockResolvedValue({
								exists: true,
								data: () => ({ role: "staff" }),
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

			const response = await request(app)
				.put("/api/sales/sale-123/verify")
				.set("Authorization", authHeader);

			expect(response.status).toBe(403);
		});
	});
});
