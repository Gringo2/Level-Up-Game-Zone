import { COLLECTIONS } from "@level-up/shared";
import { FieldValue } from "firebase-admin/firestore";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
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
				if (path === "keno_logs") {
					const chainable: any = {
						get: vi.fn().mockResolvedValue({
							docs: [
								{
									id: "keno1",
									data: () => ({ sales: 100, payouts: 50, net_profit: 50 }),
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
				.get("/api/keno")
				.set("Authorization", authHeader);

			expect(response.status).toBe(200);
			expect(response.body).toHaveLength(1);
			expect(response.body[0].sales).toBe(100);
		});

		it("filters keno logs server-side when a date range is provided", async () => {
			const range: { start?: string; end?: string } = {};
			vi.mocked(db.collection).mockImplementation((path: string) => {
				if (path !== "keno_logs") {
					return {
						doc: () => ({
							get: vi.fn().mockResolvedValue({ exists: false }),
						}),
						// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
					} as any;
				}
				const chainable: any = {
					get: vi.fn().mockImplementation(() => {
						const docs = [
							{
								id: "in-range",
								data: () => ({
									net_profit: 50,
									date: "2026-08-01T12:00:00.000Z",
								}),
							},
							{
								id: "out-of-range",
								data: () => ({
									net_profit: 99,
									date: "2026-09-15T12:00:00.000Z",
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
					where: vi.fn((field: string, op: string, value: string) => {
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
				.get("/api/keno")
				.query({ startDate: startISO, endDate: endISO })
				.set("Authorization", authHeader);

			expect(response.status).toBe(200);
			expect(response.body.map((entry: { id: string }) => entry.id)).toEqual([
				"in-range",
			]);
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
						// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
					} as any;
				}
				return {
					doc: vi.fn().mockReturnValue({ id: "new-keno-123" }),
					// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				} as any;
			});

			const response = await request(app)
				.post("/api/keno")
				.set("Authorization", authHeader)
				.send({ net_profit: 150 });

			expect(response.status).toBe(201);
			expect(response.body.net_profit).toBe(150);
		});

		it("should successfully update a keno log", async () => {
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
						id: "keno-123",
						get: vi.fn().mockResolvedValue({
							id: "keno-123",
							data: () => ({
								sales: 300,
								payouts: 50,
								net_profit: 250,
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
				.send({ net_profit: 300, editReason: "Found more tickets" });

			expect(response.status).toBe(200);
		});

		it("should successfully create a keno log as staff (unverified)", async () => {
			vi.mocked(db.collection).mockImplementation((path: string) => {
				if (path === "users") {
					return {
						doc: () => ({
							get: vi.fn().mockResolvedValue({
								exists: false,
								data: () => undefined,
							}),
						}),
						// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
					} as any;
				}
				return {
					doc: vi.fn().mockReturnValue({ id: "staff-keno-456" }),
					// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				} as any;
			});

			const response = await request(app)
				.post("/api/keno")
				.set("Authorization", authHeader)
				.send({ net_profit: 40 });

			expect(response.status).toBe(201);
			expect(response.body.verified).toBe(false);
		});

		it("should successfully delete a keno log", async () => {
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
					doc: vi.fn().mockReturnValue({ id: "keno-123" }),
					// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				} as any;
			});

			vi.mocked(db.runTransaction).mockImplementationOnce(async (cb) => {
				const mockTx = {
					get: vi.fn().mockResolvedValue({
						exists: true,
						id: "keno-123",
						data: () => ({ sales: 100, payouts: 50 }),
					}),
					set: vi.fn(),
					update: vi.fn(),
					delete: vi.fn(),
				};
				// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				return await cb(mockTx as any);
			});

			const response = await request(app)
				.delete("/api/keno/keno-123")
				.set("Authorization", authHeader)
				.send({ deleteReason: "Removed duplicate entry" });

			expect(response.status).toBe(200);
			expect(response.body.message).toBe("Deleted successfully");
		});

		it("should successfully verify a keno log", async () => {
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
					doc: vi.fn().mockReturnValue({ id: "keno-123" }),
					// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				} as any;
			});

			const response = await request(app)
				.put("/api/keno/keno-123/verify")
				.set("Authorization", authHeader);

			expect(response.status).toBe(200);
			expect(response.body.message).toBe("Verified successfully");
		});
	});

	describe("Negative Path (Rejection Scenarios)", () => {
		it("should return 400 when creating keno with a legacy sales/payouts payload (strict schema)", async () => {
			const response = await request(app)
				.post("/api/keno")
				.set("Authorization", authHeader)
				.send({ sales: 100, payouts: 50, net_profit: 50 });

			expect(response.status).toBe(400);
			expect(response.body.error).toContain("Retired field");
		});

		it("should return 400 when updating keno with a legacy sales/payouts payload (strict schema)", async () => {
			const response = await request(app)
				.put("/api/keno/keno-123")
				.set("Authorization", authHeader)
				.send({ sales: 300, editReason: "Legacy shape" });

			expect(response.status).toBe(400);
			expect(response.body.error).toContain("Retired field");
		});

		it("converges a legacy keno row to the net-only shape on edit", async () => {
			let capturedUpdate: Record<string, unknown> | undefined;
			vi.mocked(db.collection).mockImplementation((path: string) => {
				if (path === COLLECTIONS.USERS) {
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
						id: "keno-123",
						get: vi.fn().mockResolvedValue({
							id: "keno-123",
							data: () => ({ net_profit: 300 }),
						}),
					}),
					// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
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
					update: vi.fn().mockImplementation((_ref, values) => {
						capturedUpdate = values;
					}),
					delete: vi.fn(),
				};
				// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				return await cb(mockTx as any);
			});

			const response = await request(app)
				.put("/api/keno/keno-123")
				.set("Authorization", authHeader)
				.send({ net_profit: 300, editReason: "Net restated" });

			expect(response.status).toBe(200);
			expect(capturedUpdate).toMatchObject({
				net_profit: 300,
				sales: FieldValue.delete(),
				payouts: FieldValue.delete(),
			});
		});

		it("should return 400 when updating keno without editReason (Zod)", async () => {
			const response = await request(app)
				.put("/api/keno/keno-123")
				.set("Authorization", authHeader)
				.send({ net_profit: 500 });

			expect(response.status).toBe(400);
			expect(response.body.error).toContain("Required");
		});

		it("should return 400 when deleting keno without deleteReason (Zod)", async () => {
			const response = await request(app)
				.delete("/api/keno/keno-123")
				.set("Authorization", authHeader)
				.send({});

			expect(response.status).toBe(400);
			expect(response.body.error).toContain("Required");
		});

		it("should return 400 when deleting keno with a too-short deleteReason (Zod)", async () => {
			const response = await request(app)
				.delete("/api/keno/keno-123")
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
					doc: vi.fn().mockReturnValue({ id: "missing-keno" }),
					// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				} as any;
			});
			vi.mocked(db.runTransaction).mockImplementationOnce(async (cb) => {
				const mockTx = {
					get: vi.fn().mockResolvedValue({
						exists: false,
						id: "missing-keno",
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

		it("returns 500 when updating a non-existent keno log (documented contract)", async () => {
			notFoundTransaction();

			const response = await request(app)
				.put("/api/keno/missing-keno")
				.set("Authorization", authHeader)
				.send({ net_profit: 300, editReason: "Corrected figures" });

			expect(response.status).toBe(500);
			expect(response.body.error).toContain("Keno log not found");
		});

		it("returns 500 when deleting a non-existent keno log (documented contract)", async () => {
			notFoundTransaction();

			const response = await request(app)
				.delete("/api/keno/missing-keno")
				.set("Authorization", authHeader)
				.send({ deleteReason: "Removing stale record" });

			expect(response.status).toBe(500);
			expect(response.body.error).toContain("Keno log not found");
		});

		it("returns 500 when verifying a non-existent keno log (documented contract)", async () => {
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
					doc: vi.fn().mockReturnValue({ id: "missing-keno" }),
					// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				} as any;
			});

			notFoundTransaction();

			const response = await request(app)
				.put("/api/keno/missing-keno/verify")
				.set("Authorization", authHeader);

			expect(response.status).toBe(500);
			expect(response.body.error).toContain("Keno log not found");
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
				return {
					doc: vi.fn().mockReturnValue({ id: "keno-123" }),
					// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				} as any;
			});
		};

		it("returns 500 when listing keno logs crashes", async () => {
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
				if (path === "keno_logs") {
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
				.get("/api/keno")
				.set("Authorization", authHeader);

			expect(response.status).toBe(500);
			expect(response.body.error).toBe("Internal server error");
		});

		it("returns 500 when creating keno crashes inside the transaction", async () => {
			chainableCollection();
			vi.mocked(db.runTransaction).mockReset();
			vi.mocked(db.runTransaction).mockRejectedValueOnce(
				new Error("DB crashed"),
			);

			const response = await request(app)
				.post("/api/keno")
				.set("Authorization", authHeader)
				.send({ net_profit: 150 });

			expect(response.status).toBe(500);
			expect(response.body.error).toBe("Internal server error");
		});

		it("returns 500 when updating keno crashes inside the transaction", async () => {
			chainableCollection();
			vi.mocked(db.runTransaction).mockReset();
			vi.mocked(db.runTransaction).mockRejectedValueOnce(
				new Error("DB crashed"),
			);

			const response = await request(app)
				.put("/api/keno/keno-123")
				.set("Authorization", authHeader)
				.send({ net_profit: 300, editReason: "Corrected figures" });

			expect(response.status).toBe(500);
			expect(response.body.error).toBe("Internal server error");
		});

		it("returns 500 when deleting keno crashes inside the transaction", async () => {
			chainableCollection();
			vi.mocked(db.runTransaction).mockReset();
			vi.mocked(db.runTransaction).mockRejectedValueOnce(
				new Error("DB crashed"),
			);

			const response = await request(app)
				.delete("/api/keno/keno-123")
				.set("Authorization", authHeader)
				.send({ deleteReason: "Removing stale record" });

			expect(response.status).toBe(500);
			expect(response.body.error).toBe("Internal server error");
		});

		it("returns 500 when verifying keno crashes inside the transaction", async () => {
			chainableCollection();
			vi.mocked(db.runTransaction).mockReset();
			vi.mocked(db.runTransaction).mockRejectedValueOnce(
				new Error("DB crashed"),
			);

			const response = await request(app)
				.put("/api/keno/keno-123/verify")
				.set("Authorization", authHeader);

			expect(response.status).toBe(500);
			expect(response.body.error).toBe("Internal server error");
		});
	});

	describe("Unauthorized (missing credentials)", () => {
		it("returns 401 without a bearer token on GET", async () => {
			const response = await request(app).get("/api/keno");

			expect(response.status).toBe(401);
			expect(response.body.error).toContain("No token provided");
		});

		it("returns 401 without a bearer token on POST", async () => {
			const response = await request(app)
				.post("/api/keno")
				.send({ net_profit: 50 });

			expect(response.status).toBe(401);
		});

		it("returns 401 without a bearer token on DELETE", async () => {
			const response = await request(app)
				.delete("/api/keno/keno-123")
				.send({ deleteReason: "Removing stale record" });

			expect(response.status).toBe(401);
		});
	});
});
