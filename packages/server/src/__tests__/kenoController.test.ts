import request from "supertest";
import { describe, expect, it, vi, beforeEach } from "vitest";
import "./setupTests.js";
import app from "../app.js";

const { db } = await import("../firebase.js");

describe("Keno Integration Tests", () => {
	const authHeader = "Bearer valid-mock-token";

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("Golden Path (Success Scenarios)", () => {
		it("should successfully list keno logs", async () => {
			vi.mocked(db.collection).mockImplementation((path: string) => {
				if (path === "keno_logs") {
					return {
						get: vi.fn().mockResolvedValue({
							docs: [
								{
									id: "keno1",
									data: () => ({ sales: 100, payouts: 50, net_profit: 50 }),
								},
							],
						}),
					} as any;
				}
				return { get: vi.fn().mockResolvedValue({ docs: [] }) } as any;
			});

			const response = await request(app)
				.get("/api/keno")
				.set("Authorization", authHeader);

			expect(response.status).toBe(200);
			expect(response.body).toHaveLength(1);
			expect(response.body[0].sales).toBe(100);
		});

		it("should successfully create a keno log", async () => {
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
					doc: vi.fn().mockReturnValue({ id: "new-keno-123" }),
				} as any;
			});

			const response = await request(app)
				.post("/api/keno")
				.set("Authorization", authHeader)
				.send({ sales: 200, payouts: 50, net_profit: 150 });

			expect(response.status).toBe(201);
			expect(response.body.net_profit).toBe(150);
		});

		it("should successfully update a keno log", async () => {
			vi.mocked(db.collection).mockImplementation((path: string) => {
				return {
					doc: vi.fn().mockReturnValue({ id: "keno-123" }),
				} as any;
			});

			vi.mocked(db.runTransaction).mockImplementationOnce(async (cb) => {
				const mockTx = {
					get: vi.fn().mockResolvedValue({
						exists: true,
						id: "keno-123",
						data: () => ({ sales: 200, payouts: 50, net_profit: 150 }),
					}),
					set: vi.fn(),
					update: vi.fn(),
					delete: vi.fn(),
				};
				// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				return await cb(mockTx as any);
			});

			const response = await request(app)
				.put("/api/keno/keno-123")
				.set("Authorization", authHeader)
				.send({ sales: 300, editReason: "Found more tickets" });

			expect(response.status).toBe(200);
		});
	});

	describe("Negative Path (Rejection Scenarios)", () => {
		it("should return 400 when creating keno with negative sales (Zod)", async () => {
			const response = await request(app)
				.post("/api/keno")
				.set("Authorization", authHeader)
				.send({ sales: -100, payouts: 50, net_profit: -150 });

			expect(response.status).toBe(400);
			expect(response.body.error).toContain("Sales cannot be negative");
		});

		it("should return 400 when updating keno without editReason (Zod)", async () => {
			const response = await request(app)
				.put("/api/keno/keno-123")
				.set("Authorization", authHeader)
				.send({ sales: 500 }); 

			expect(response.status).toBe(400);
			expect(response.body.error).toContain("Required");
		});
	});
});
