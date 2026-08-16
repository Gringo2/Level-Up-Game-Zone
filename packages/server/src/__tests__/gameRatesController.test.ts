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
			vi.mocked(db.collection).mockImplementation((_path: string) => {
				return {
					doc: vi.fn().mockReturnValue({ id: "new-rate-123" }),
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
			vi.mocked(db.collection).mockImplementation((_path: string) => {
				return {
					doc: vi.fn().mockReturnValue({ id: "rate-123" }),
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
			vi.mocked(db.collection).mockImplementation((_path: string) => {
				return {
					doc: vi.fn().mockReturnValue({ id: "rate-123" }),
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
			vi.mocked(db.collection).mockImplementation((_path: string) => {
				return {
					doc: vi.fn().mockReturnValue({ id: "rate-123" }),
					// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				} as any;
			});
		};

		it("returns 500 when listing game rates crashes", async () => {
			vi.mocked(db.collection).mockImplementation((path: string) => {
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
			expect(response.body.error).toBe("DB crashed");
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
			expect(response.body.error).toContain("DB crashed");
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
			expect(response.body.error).toContain("DB crashed");
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
