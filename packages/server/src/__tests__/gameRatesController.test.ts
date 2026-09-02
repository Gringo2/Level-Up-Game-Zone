import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import "./setupTests.js";
import app from "../app.js";

const { db } = await import("../firebase.js");

describe("Game Rates Integration Tests", () => {
	const authHeader = "Bearer valid-mock-token";

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("Golden Path (Success Scenarios)", () => {
		it("should successfully list game rates", async () => {
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
				if (path === "game_rates") {
					return {
						get: vi.fn().mockResolvedValue({
							docs: [
								{
									id: "rate1",
									data: () => ({ game_name: "Pool", price_per_unit: 10 }),
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
				.get("/api/rates")
				.set("Authorization", authHeader);

			expect(response.status).toBe(200);
			expect(response.body).toHaveLength(1);
			expect(response.body[0].game_name).toBe("Pool");
		});

		it("should successfully create a game rate", async () => {
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
				if (path === "game_rates") {
					return {
						get: vi.fn().mockResolvedValue({ docs: [] }),
						doc: vi.fn().mockReturnValue({ id: "new-rate-123" }),
						// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
					} as any;
				}
				return {
					doc: vi.fn().mockReturnValue({ id: "audit-1" }),
					// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				} as any;
			});

			const response = await request(app)
				.post("/api/rates")
				.set("Authorization", authHeader)
				.send({
					game_name: "Billiards",
					price_per_unit: 15,
					unit_type: "Hour",
				});

			expect(response.status).toBe(201);
			expect(response.body.price_per_unit).toBe(15);
		});

		it("should successfully update a game rate", async () => {
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
					doc: vi.fn().mockReturnValue({
						id: "rate-123",
						get: vi.fn().mockResolvedValue({
							id: "rate-123",
							data: () => ({
								game_name: "Billiards",
								price_per_unit: 20,
								unit_type: "Hour",
								isActive: true,
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
						id: "rate-123",
						data: () => ({ game_name: "Billiards", price_per_unit: 15 }),
					}),
					set: vi.fn(),
					update: vi.fn(),
					delete: vi.fn(),
				};
				// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				return await cb(mockTx as any);
			});

			const response = await request(app)
				.put("/api/rates/rate-123")
				.set("Authorization", authHeader)
				.send({ price_per_unit: 20, editReason: "Price hike" });

			expect(response.status).toBe(200);
		});

		it("should successfully update a game rate with all partial fields", async () => {
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
				if (path === "game_rates") {
					return {
						get: vi.fn().mockResolvedValue({
							docs: [
								{
									id: "rate-123",
									data: () => ({
										game_name: "Darts",
										isActive: true,
									}),
								},
							],
						}),
						doc: vi.fn().mockReturnValue({
							id: "rate-123",
							get: vi.fn().mockResolvedValue({
								id: "rate-123",
								data: () => ({
									game_name: "Darts",
									price_per_unit: 25,
									unit_type: "Game",
									isActive: false,
								}),
							}),
						}),
						// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
					} as any;
				}
				return {
					doc: vi.fn().mockReturnValue({ id: "audit-1" }),
					// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				} as any;
			});

			vi.mocked(db.runTransaction).mockImplementationOnce(async (cb) => {
				const mockTx = {
					get: vi.fn().mockResolvedValue({
						exists: true,
						id: "rate-123",
						data: () => ({ game_name: "Billiards", price_per_unit: 15 }),
					}),
					getAll: vi.fn().mockResolvedValue([
						{
							exists: true,
							id: "rate-123",
							data: () => ({ game_name: "Darts", isActive: true }),
						},
					]),
					set: vi.fn(),
					update: vi.fn(),
					delete: vi.fn(),
				};
				// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				return await cb(mockTx as any);
			});

			const response = await request(app)
				.put("/api/rates/rate-123")
				.set("Authorization", authHeader)
				.send({
					game_name: "Darts",
					price_per_unit: 25,
					unit_type: "Game",
					isActive: false,
					editReason: "Game rotation",
				});

			expect(response.status).toBe(200);
		});
	});

	describe("Negative Path (Rejection Scenarios)", () => {
		it("should return 400 when creating rate with invalid unit_type (Zod)", async () => {
			const response = await request(app)
				.post("/api/rates")
				.set("Authorization", authHeader)
				.send({
					game_name: "Billiards",
					price_per_unit: 15,
					unit_type: "Minute", // invalid
				});

			expect(response.status).toBe(400);
			expect(response.body.error).toContain(
				"Unit type must be 'Hour' or 'Game'",
			);
		});

		it("should return 400 when updating rate without editReason (Zod)", async () => {
			const response = await request(app)
				.put("/api/rates/rate-123")
				.set("Authorization", authHeader)
				.send({ price_per_unit: 25 }); // missing editReason

			expect(response.status).toBe(400);
			expect(response.body.error).toContain("Required");
		});

		it("should return 400 when updating rate with a too-short editReason (Zod)", async () => {
			const response = await request(app)
				.put("/api/rates/rate-123")
				.set("Authorization", authHeader)
				.send({ price_per_unit: 25, editReason: "x" });

			expect(response.status).toBe(400);
			expect(response.body.error).toContain("at least 3 characters");
		});

		it("should return 400 when updating rate with invalid unit_type (UpdateGameRateSchema errorMap)", async () => {
			const response = await request(app)
				.put("/api/rates/rate-123")
				.set("Authorization", authHeader)
				.send({ unit_type: "Minute", editReason: "Price hike" });

			expect(response.status).toBe(400);
			expect(response.body.error).toContain(
				"Unit type must be 'Hour' or 'Game'",
			);
		});

		it("should return 409 when creating rate with duplicate name", async () => {
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
				if (path === "game_rates") {
					return {
						get: vi.fn().mockResolvedValue({
							docs: [
								{
									id: "existing-rate",
									data: () => ({
										game_name: "Pool",
										isActive: true,
									}),
								},
							],
						}),
						doc: vi.fn().mockReturnValue({ id: "new-rate-123" }),
						// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
					} as any;
				}
				return {
					doc: vi.fn().mockReturnValue({ id: "audit-1" }),
					// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				} as any;
			});

			vi.mocked(db.runTransaction).mockImplementationOnce(async (cb) => {
				const mockTx = {
					get: vi.fn().mockResolvedValue({ exists: true }),
					getAll: vi.fn().mockResolvedValue([
						{
							exists: true,
							id: "existing-rate",
							data: () => ({ game_name: "Pool", isActive: true }),
						},
					]),
					set: vi.fn(),
					update: vi.fn(),
					delete: vi.fn(),
				};
				// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				return await cb(mockTx as any);
			});

			const response = await request(app)
				.post("/api/rates")
				.set("Authorization", authHeader)
				.send({
					game_name: "Pool",
					price_per_unit: 15,
					unit_type: "Game",
				});

			expect(response.status).toBe(409);
			expect(response.body.error).toContain("already exists");
		});

		it("should return 409 when creating rate with case-insensitive duplicate name", async () => {
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
				if (path === "game_rates") {
					return {
						get: vi.fn().mockResolvedValue({
							docs: [
								{
									id: "existing-rate",
									data: () => ({
										game_name: "PS4",
										isActive: true,
									}),
								},
							],
						}),
						doc: vi.fn().mockReturnValue({ id: "new-rate-123" }),
						// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
					} as any;
				}
				return {
					doc: vi.fn().mockReturnValue({ id: "audit-1" }),
					// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				} as any;
			});

			vi.mocked(db.runTransaction).mockImplementationOnce(async (cb) => {
				const mockTx = {
					get: vi.fn().mockResolvedValue({ exists: true }),
					getAll: vi.fn().mockResolvedValue([
						{
							exists: true,
							id: "existing-rate",
							data: () => ({ game_name: "PS4", isActive: true }),
						},
					]),
					set: vi.fn(),
					update: vi.fn(),
					delete: vi.fn(),
				};
				// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				return await cb(mockTx as any);
			});

			const response = await request(app)
				.post("/api/rates")
				.set("Authorization", authHeader)
				.send({
					game_name: "  ps4  ",
					price_per_unit: 5,
					unit_type: "Hour",
				});

			expect(response.status).toBe(409);
			expect(response.body.error).toContain("already exists");
		});

		it("should allow creating rate if duplicate is inactive", async () => {
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
				if (path === "game_rates") {
					return {
						get: vi.fn().mockResolvedValue({
							docs: [
								{
									id: "existing-rate",
									data: () => ({
										game_name: "Pool",
										isActive: false,
									}),
								},
							],
						}),
						doc: vi.fn().mockReturnValue({ id: "new-rate-123" }),
						// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
					} as any;
				}
				return {
					doc: vi.fn().mockReturnValue({ id: "audit-1" }),
					// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				} as any;
			});

			vi.mocked(db.runTransaction).mockImplementationOnce(async (cb) => {
				const mockTx = {
					get: vi.fn().mockResolvedValue({ exists: true }),
					getAll: vi.fn().mockResolvedValue([
						{
							exists: true,
							id: "existing-rate",
							data: () => ({ game_name: "Pool", isActive: false }),
						},
					]),
					set: vi.fn(),
					update: vi.fn(),
					delete: vi.fn(),
				};
				// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				return await cb(mockTx as any);
			});

			const response = await request(app)
				.post("/api/rates")
				.set("Authorization", authHeader)
				.send({
					game_name: "Pool",
					price_per_unit: 15,
					unit_type: "Game",
				});

			expect(response.status).toBe(201);
			expect(response.body.game_name).toBe("Pool");
		});

		it("should return 409 when updating rate name to a duplicate", async () => {
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
				if (path === "game_rates") {
					return {
						get: vi.fn().mockResolvedValue({
							docs: [
								{
									id: "rate-123",
									data: () => ({
										game_name: "PS4",
										isActive: true,
									}),
								},
								{
									id: "rate-456",
									data: () => ({
										game_name: "Pool",
										isActive: true,
									}),
								},
							],
						}),
						doc: vi.fn().mockReturnValue({ id: "rate-123" }),
						// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
					} as any;
				}
				return {
					doc: vi.fn().mockReturnValue({ id: "audit-1" }),
					// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				} as any;
			});

			vi.mocked(db.runTransaction).mockImplementationOnce(async (cb) => {
				const mockTx = {
					get: vi.fn().mockResolvedValue({
						exists: true,
						id: "rate-123",
						data: () => ({ game_name: "PS4", price_per_unit: 5 }),
					}),
					getAll: vi.fn().mockResolvedValue([
						{
							exists: true,
							id: "rate-123",
							data: () => ({ game_name: "PS4", isActive: true }),
						},
						{
							exists: true,
							id: "rate-456",
							data: () => ({ game_name: "Pool", isActive: true }),
						},
					]),
					set: vi.fn(),
					update: vi.fn(),
					delete: vi.fn(),
				};
				// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				return await cb(mockTx as any);
			});

			const response = await request(app)
				.put("/api/rates/rate-123")
				.set("Authorization", authHeader)
				.send({ game_name: "Pool", editReason: "Rename to match other" });

			expect(response.status).toBe(409);
			expect(response.body.error).toContain("already exists");
		});

		it("should allow keeping the same name on update", async () => {
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
				if (path === "game_rates") {
					return {
						get: vi.fn().mockResolvedValue({
							docs: [
								{
									id: "rate-123",
									data: () => ({
										game_name: "PS4",
										isActive: true,
									}),
								},
							],
						}),
						doc: vi.fn().mockReturnValue({
							id: "rate-123",
							get: vi.fn().mockResolvedValue({
								id: "rate-123",
								data: () => ({
									game_name: "PS4",
									price_per_unit: 5,
									unit_type: "Hour",
								}),
							}),
						}),
						// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
					} as any;
				}
				return {
					doc: vi.fn().mockReturnValue({ id: "audit-1" }),
					// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				} as any;
			});

			vi.mocked(db.runTransaction).mockImplementationOnce(async (cb) => {
				const mockTx = {
					get: vi.fn().mockResolvedValue({
						exists: true,
						id: "rate-123",
						data: () => ({
							game_name: "PS4",
							price_per_unit: 5,
							unit_type: "Hour",
						}),
					}),
					getAll: vi.fn().mockResolvedValue([
						{
							exists: true,
							id: "rate-123",
							data: () => ({ game_name: "PS4", isActive: true }),
						},
					]),
					set: vi.fn(),
					update: vi.fn(),
					delete: vi.fn(),
				};
				// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				return await cb(mockTx as any);
			});

			const response = await request(app)
				.put("/api/rates/rate-123")
				.set("Authorization", authHeader)
				.send({ game_name: "PS4", editReason: "No change to name" });

			expect(response.status).toBe(200);
		});
	});

	describe("Not Found Contract (non-existent documents)", () => {
		const notFoundTransaction = () => {
			vi.mocked(db.runTransaction).mockImplementationOnce(async (cb) => {
				const mockTx = {
					get: vi.fn().mockResolvedValue({
						exists: false,
						id: "missing-rate",
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

		it("returns 500 when updating a non-existent game rate (documented contract)", async () => {
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
					doc: vi.fn().mockReturnValue({ id: "missing-rate" }),
					// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				} as any;
			});
			notFoundTransaction();

			const response = await request(app)
				.put("/api/rates/missing-rate")
				.set("Authorization", authHeader)
				.send({ price_per_unit: 25, editReason: "Corrected figures" });

			expect(response.status).toBe(500);
			expect(response.body.error).toContain("Rate not found");
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
						// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
					} as any;
				}
				if (path === "game_rates") {
					return {
						get: vi.fn().mockResolvedValue({ docs: [] }),
						doc: vi.fn().mockReturnValue({ id: "rate-123" }),
						// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
					} as any;
				}
				return {
					doc: vi.fn().mockReturnValue({ id: "rate-123" }),
					// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				} as any;
			});
		};

		it("returns 500 when listing game rates crashes", async () => {
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
				if (path === "game_rates") {
					return {
						get: vi.fn().mockRejectedValue(new Error("DB crashed")),
						// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
					} as any;
				}
				// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				return { get: vi.fn().mockResolvedValue({ docs: [] }) } as any;
			});

			const response = await request(app)
				.get("/api/rates")
				.set("Authorization", authHeader);

			expect(response.status).toBe(500);
			expect(response.body.error).toBe("Internal server error");
		});

		it("returns 500 when creating game rate crashes inside the transaction", async () => {
			chainableCollection();
			vi.mocked(db.runTransaction).mockRejectedValueOnce(
				new Error("DB crashed"),
			);

			const response = await request(app)
				.post("/api/rates")
				.set("Authorization", authHeader)
				.send({
					game_name: "Billiards",
					price_per_unit: 15,
					unit_type: "Hour",
				});

			expect(response.status).toBe(500);
			expect(response.body.error).toBe("Internal server error");
		});

		it("returns 500 when updating game rate crashes inside the transaction", async () => {
			chainableCollection();
			vi.mocked(db.runTransaction).mockRejectedValueOnce(
				new Error("DB crashed"),
			);

			const response = await request(app)
				.put("/api/rates/rate-123")
				.set("Authorization", authHeader)
				.send({ price_per_unit: 25, editReason: "Corrected figures" });

			expect(response.status).toBe(500);
			expect(response.body.error).toBe("Internal server error");
		});
	});

	describe("Role-Based Access Control (RBAC)", () => {
		it("allows staff role to GET /api/rates for the POS catalog", async () => {
			vi.mocked(db.collection).mockImplementation((path: string) => {
				if (path === "users") {
					return {
						doc: () => ({
							get: vi.fn().mockResolvedValue({
								exists: true,
								data: () => ({ role: "staff" }),
							}),
						}),
						// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
					} as any;
				}
				if (path === "game_rates") {
					return {
						get: vi.fn().mockResolvedValue({
							docs: [
								{
									id: "rate-ps4",
									data: () => ({
										game_name: "PS4",
										price_per_unit: 10,
										isActive: true,
									}),
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
				.get("/api/rates")
				.set("Authorization", authHeader);

			expect(response.status).toBe(200);
			expect(response.body).toHaveLength(1);
			expect(response.body[0].game_name).toBe("PS4");
		});

		it("allows manager role to GET /api/rates", async () => {
			vi.mocked(db.collection).mockImplementation((path: string) => {
				if (path === "users") {
					return {
						doc: () => ({
							get: vi.fn().mockResolvedValue({
								exists: true,
								data: () => ({ role: "manager" }),
							}),
						}),
						// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
					} as any;
				}
				if (path === "game_rates") {
					return {
						get: vi.fn().mockResolvedValue({
							docs: [
								{
									id: "rate-pool",
									data: () => ({
										game_name: "Pool",
										price_per_unit: 15,
										isActive: true,
									}),
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
				.get("/api/rates")
				.set("Authorization", authHeader);

			expect(response.status).toBe(200);
			expect(response.body).toHaveLength(1);
			expect(response.body[0].game_name).toBe("Pool");
		});

		it("blocks staff role from POST /api/rates with 403 Forbidden", async () => {
			vi.mocked(db.collection).mockImplementation((path: string) => {
				if (path === "users") {
					return {
						doc: () => ({
							get: vi.fn().mockResolvedValue({
								exists: true,
								data: () => ({ role: "staff" }),
							}),
						}),
						// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
					} as any;
				}
				// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				return { get: vi.fn().mockResolvedValue({ docs: [] }) } as any;
			});

			const response = await request(app)
				.post("/api/rates")
				.set("Authorization", authHeader)
				.send({
					game_name: "VR",
					price_per_unit: 25,
					unit_type: "Hour",
				});

			expect(response.status).toBe(403);
			expect(response.body.error).toContain("Insufficient role permissions");
		});

		it("blocks staff role from PUT /api/rates/:id with 403 Forbidden", async () => {
			vi.mocked(db.collection).mockImplementation((path: string) => {
				if (path === "users") {
					return {
						doc: () => ({
							get: vi.fn().mockResolvedValue({
								exists: true,
								data: () => ({ role: "staff" }),
							}),
						}),
						// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
					} as any;
				}
				// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				return { get: vi.fn().mockResolvedValue({ docs: [] }) } as any;
			});

			const response = await request(app)
				.put("/api/rates/rate-123")
				.set("Authorization", authHeader)
				.send({
					price_per_unit: 30,
					editReason: "Unauthorized rate change attempt",
				});

			expect(response.status).toBe(403);
			expect(response.body.error).toContain("Insufficient role permissions");
		});
	});

	describe("Unauthorized (missing credentials)", () => {
		it("returns 401 without a bearer token on GET", async () => {
			const response = await request(app).get("/api/rates");

			expect(response.status).toBe(401);
			expect(response.body.error).toContain("No token provided");
		});

		it("returns 401 without a bearer token on POST", async () => {
			const response = await request(app).post("/api/rates").send({
				game_name: "Billiards",
				price_per_unit: 15,
				unit_type: "Hour",
			});

			expect(response.status).toBe(401);
		});
	});
});
