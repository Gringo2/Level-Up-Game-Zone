import request from "supertest";
import { describe, expect, it, vi, beforeEach } from "vitest";
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
					} as any;
				}
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
				return {
					doc: vi.fn().mockReturnValue({ id: "new-rate-123" }),
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
				return {
					doc: vi.fn().mockReturnValue({ id: "rate-123" }),
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
			expect(response.body.error).toContain("Unit type must be 'Hour' or 'Game'");
		});

		it("should return 400 when updating rate without editReason (Zod)", async () => {
			const response = await request(app)
				.put("/api/rates/rate-123")
				.set("Authorization", authHeader)
				.send({ price_per_unit: 25 }); // missing editReason

			expect(response.status).toBe(400);
			expect(response.body.error).toContain("Required");
		});
	});
});
