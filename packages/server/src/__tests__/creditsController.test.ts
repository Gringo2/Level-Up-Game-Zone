import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
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

		it("should successfully update a credit with status resolution (partial fields)", async () => {
			const updateMock = vi.fn();
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
					update: updateMock,
					delete: vi.fn(),
				};
				// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				return await cb(mockTx as any);
			});

			const response = await request(app)
				.put("/api/credits/credit-123")
				.set("Authorization", authHeader)
				.send({
					employee_name: "John Doe",
					reason: "Salary advance",
					status: "Resolved",
					editReason: "Salary paid",
				});

			expect(response.status).toBe(200);
			expect(updateMock).toHaveBeenCalledWith(
				expect.objectContaining({ id: "credit-123" }),
				expect.objectContaining({
					reason: "Salary advance",
					status: "Resolved",
				}),
			);
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

	describe("Not Found Contract (non-existent documents)", () => {
		const notFoundTransaction = () => {
			vi.mocked(db.runTransaction).mockImplementationOnce(async (cb) => {
				const mockTx = {
					get: vi.fn().mockResolvedValue({
						exists: false,
						id: "missing-credit",
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

		it("returns 500 when updating a non-existent credit (documented contract)", async () => {
			notFoundTransaction();

			const response = await request(app)
				.put("/api/credits/missing-credit")
				.set("Authorization", authHeader)
				.send({ amount: 100, editReason: "Corrected figures" });

			expect(response.status).toBe(500);
			expect(response.body.error).toContain("Credit not found");
		});

		it("returns 500 when deleting a non-existent credit (documented contract)", async () => {
			notFoundTransaction();

			const response = await request(app)
				.delete("/api/credits/missing-credit")
				.set("Authorization", authHeader)
				.send({ deleteReason: "Removing stale record" });

			expect(response.status).toBe(500);
			expect(response.body.error).toContain("Credit not found");
		});
	});

	describe("Database Crash (500 fallback)", () => {
		const chainableCollection = () => {
			vi.mocked(db.collection).mockImplementation((path: string) => {
				return {
					doc: vi.fn().mockReturnValue({ id: "credit-123" }),
					// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				} as any;
			});
		};

		it("returns 500 when listing credits crashes", async () => {
			vi.mocked(db.collection).mockImplementation((path: string) => {
				if (path === "credits") {
					return {
						get: vi.fn().mockRejectedValue(new Error("DB crashed")),
						// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
					} as any;
				}
				// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				return { get: vi.fn().mockResolvedValue({ docs: [] }) } as any;
			});

			const response = await request(app)
				.get("/api/credits")
				.set("Authorization", authHeader);

			expect(response.status).toBe(500);
			expect(response.body.error).toBe("DB crashed");
		});

		it("returns 500 when creating credit crashes inside the transaction", async () => {
			chainableCollection();
			vi.mocked(db.runTransaction).mockRejectedValueOnce(
				new Error("DB crashed"),
			);

			const response = await request(app)
				.post("/api/credits")
				.set("Authorization", authHeader)
				.send({ employee_name: "John Doe", amount: 50, reason: "Advance" });

			expect(response.status).toBe(500);
			expect(response.body.error).toContain("DB crashed");
		});

		it("returns 500 when updating credit crashes inside the transaction", async () => {
			chainableCollection();
			vi.mocked(db.runTransaction).mockRejectedValueOnce(
				new Error("DB crashed"),
			);

			const response = await request(app)
				.put("/api/credits/credit-123")
				.set("Authorization", authHeader)
				.send({ amount: 100, editReason: "Corrected figures" });

			expect(response.status).toBe(500);
			expect(response.body.error).toContain("DB crashed");
		});

		it("returns 500 when deleting credit crashes inside the transaction", async () => {
			chainableCollection();
			vi.mocked(db.runTransaction).mockRejectedValueOnce(
				new Error("DB crashed"),
			);

			const response = await request(app)
				.delete("/api/credits/credit-123")
				.set("Authorization", authHeader)
				.send({ deleteReason: "Removing stale record" });

			expect(response.status).toBe(500);
			expect(response.body.error).toContain("DB crashed");
		});
	});

	describe("Unauthorized (missing credentials)", () => {
		it("returns 401 without a bearer token on GET", async () => {
			const response = await request(app).get("/api/credits");

			expect(response.status).toBe(401);
			expect(response.body.error).toContain("No token provided");
		});

		it("returns 401 without a bearer token on POST", async () => {
			const response = await request(app)
				.post("/api/credits")
				.send({ employee_name: "John Doe", amount: 50 });

			expect(response.status).toBe(401);
		});

		it("returns 401 without a bearer token on DELETE", async () => {
			const response = await request(app)
				.delete("/api/credits/credit-123")
				.send({ deleteReason: "Removing stale record" });

			expect(response.status).toBe(401);
		});
	});
});
