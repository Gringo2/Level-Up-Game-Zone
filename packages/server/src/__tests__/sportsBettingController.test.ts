import { COLLECTIONS } from "@level-up/shared";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import "./setupTests.js";
import app from "../app.js";

const { db } = await import("../firebase.js");

const authHeader = "Bearer valid-mock-token";

// ── Helpers ───────────────────────────────────────────────────────────────────

const mockUsers = (role: "admin" | "manager" | "staff") =>
	({
		doc: vi.fn().mockReturnValue({
			get: vi.fn().mockResolvedValue({
				exists: true,
				data: () => ({ role, displayName: "Test User" }),
			}),
		}),
		// biome-ignore lint/suspicious/noExplicitAny: Firestore mock requires any
	}) as any;

const makeBettingLog = (id = "b1", net = 75) => ({
	id,
	data: () => ({
		net_profit: net,
		user_id: "user-1",
		user_name: "Test User",
		date: new Date().toISOString(),
		verified: true,
	}),
});

// biome-ignore lint/suspicious/noExplicitAny: Firestore mock requires any
const makeTransactionMock = (docData: Record<string, unknown>): any => ({
	runTransaction: vi
		.fn()
		.mockImplementation(
			async (fn: (t: Record<string, unknown>) => Promise<void>) => {
				const t = {
					get: vi.fn().mockResolvedValue({
						exists: true,
						id: "b1",
						data: () => docData,
					}),
					set: vi.fn(),
					update: vi.fn(),
					delete: vi.fn(),
				};
				await fn(t);
			},
		),
});

describe("Sports Betting Integration Tests", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	// ── Golden Path ─────────────────────────────────────────────────────────────

	describe("Golden Path (Success Scenarios)", () => {
		it("GET /api/sports-betting — returns list of logs", async () => {
			vi.mocked(db.collection).mockImplementation((path: string) => {
				if (path === "users") return mockUsers("admin");
				if (path === COLLECTIONS.SPORTS_BETTING_LOGS) {
					// biome-ignore lint/suspicious/noExplicitAny: Firestore mock
					const chainable: any = {
						where: vi.fn().mockReturnThis(),
						orderBy: vi.fn().mockReturnThis(),
						get: vi.fn().mockResolvedValue({
							docs: [makeBettingLog()],
						}),
					};
					return chainable;
				}
				return {
					get: vi.fn().mockResolvedValue({ docs: [] }),
					where: vi.fn().mockReturnThis(),
					orderBy: vi.fn().mockReturnThis(),
					// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				} as any;
			});

			const response = await request(app)
				.get("/api/sports-betting")
				.set("Authorization", authHeader);

			expect(response.status).toBe(200);
			expect(response.body).toHaveLength(1);
			expect(response.body[0].net_profit).toBe(75);
		});

		it("POST /api/sports-betting — manager creates log with net_profit: 150", async () => {
			const txMock = makeTransactionMock({ net_profit: 150 });
			vi.mocked(db.collection).mockImplementation((path: string) => {
				if (path === "users") return mockUsers("manager");
				// biome-ignore lint/suspicious/noExplicitAny: Firestore mock
				return { doc: vi.fn().mockReturnValue({ id: "b-new" }) } as any;
			});
			vi.mocked(db.runTransaction).mockImplementation(txMock.runTransaction);

			const response = await request(app)
				.post("/api/sports-betting")
				.set("Authorization", authHeader)
				.send({ net_profit: 150 });

			expect(response.status).toBe(201);
			expect(response.body.net_profit).toBe(150);
		});

		it("POST /api/sports-betting — accepts negative net_profit (losing day)", async () => {
			const txMock = makeTransactionMock({ net_profit: -25.5 });
			vi.mocked(db.collection).mockImplementation((path: string) => {
				if (path === "users") return mockUsers("manager");
				// biome-ignore lint/suspicious/noExplicitAny: Firestore mock
				return { doc: vi.fn().mockReturnValue({ id: "b-neg" }) } as any;
			});
			vi.mocked(db.runTransaction).mockImplementation(txMock.runTransaction);

			const response = await request(app)
				.post("/api/sports-betting")
				.set("Authorization", authHeader)
				.send({ net_profit: -25.5 });

			expect(response.status).toBe(201);
			expect(response.body.net_profit).toBe(-25.5);
		});

		it("PUT /api/sports-betting/:id — manager updates with valid editReason", async () => {
			const oldDoc = {
				net_profit: 75,
				user_id: "u1",
				date: new Date().toISOString(),
			};
			const txMock = makeTransactionMock(oldDoc);
			vi.mocked(db.collection).mockImplementation((path: string) => {
				if (path === "users") return mockUsers("manager");
				if (path === COLLECTIONS.SPORTS_BETTING_LOGS) {
					return {
						doc: vi.fn().mockReturnValue({
							get: vi.fn().mockResolvedValue({
								exists: true,
								id: "b1",
								data: () => ({ ...oldDoc, net_profit: 200 }),
							}),
						}),
						// biome-ignore lint/suspicious/noExplicitAny: Firestore mock
					} as any;
				}
				// biome-ignore lint/suspicious/noExplicitAny: Firestore mock
				return { doc: vi.fn().mockReturnValue({ id: "audit-1" }) } as any;
			});
			vi.mocked(db.runTransaction).mockImplementation(txMock.runTransaction);

			const response = await request(app)
				.put("/api/sports-betting/b1")
				.set("Authorization", authHeader)
				.send({ net_profit: 200, editReason: "Correction entry" });

			expect(response.status).toBe(200);
		});

		it("DELETE /api/sports-betting/:id — manager deletes with valid reason", async () => {
			const oldDoc = {
				net_profit: 75,
				user_id: "u1",
				date: new Date().toISOString(),
			};
			const txMock = makeTransactionMock(oldDoc);
			vi.mocked(db.collection).mockImplementation((path: string) => {
				if (path === "users") return mockUsers("manager");
				// biome-ignore lint/suspicious/noExplicitAny: Firestore mock
				return { doc: vi.fn().mockReturnValue({ id: "b1" }) } as any;
			});
			vi.mocked(db.runTransaction).mockImplementation(txMock.runTransaction);

			const response = await request(app)
				.delete("/api/sports-betting/b1")
				.set("Authorization", authHeader)
				.send({ deleteReason: "Wrong entry" });

			expect(response.status).toBe(200);
		});

		it("PUT /api/sports-betting/:id/verify — sets verified: true", async () => {
			const oldDoc = {
				net_profit: 75,
				user_id: "u1",
				date: new Date().toISOString(),
				verified: false,
			};
			const txMock = makeTransactionMock(oldDoc);
			vi.mocked(db.collection).mockImplementation((path: string) => {
				if (path === "users") return mockUsers("manager");
				// biome-ignore lint/suspicious/noExplicitAny: Firestore mock
				return { doc: vi.fn().mockReturnValue({ id: "b1" }) } as any;
			});
			vi.mocked(db.runTransaction).mockImplementation(txMock.runTransaction);

			const response = await request(app)
				.put("/api/sports-betting/b1/verify")
				.set("Authorization", authHeader);

			expect(response.status).toBe(200);
		});
	});

	// ── Schema Rejection (Negative Path) ────────────────────────────────────────

	describe("Schema Rejection (Negative Path)", () => {
		it("POST with null net_profit → 400 (JSON-NaN hole guard)", async () => {
			vi.mocked(db.collection).mockImplementation((path: string) => {
				if (path === "users") return mockUsers("manager");
				// biome-ignore lint/suspicious/noExplicitAny: Firestore mock
				return { doc: vi.fn().mockReturnValue({ id: "b-new" }) } as any;
			});

			const response = await request(app)
				.post("/api/sports-betting")
				.set("Authorization", authHeader)
				.send({ net_profit: null });

			expect(response.status).toBe(400);
		});

		it("POST with empty-string net_profit → 400", async () => {
			vi.mocked(db.collection).mockImplementation((path: string) => {
				if (path === "users") return mockUsers("manager");
				// biome-ignore lint/suspicious/noExplicitAny: Firestore mock
				return { doc: vi.fn().mockReturnValue({ id: "b-new" }) } as any;
			});

			const response = await request(app)
				.post("/api/sports-betting")
				.set("Authorization", authHeader)
				.send({ net_profit: "" });

			expect(response.status).toBe(400);
		});

		it("PUT with missing editReason → 400", async () => {
			const response = await request(app)
				.put("/api/sports-betting/b1")
				.set("Authorization", authHeader)
				.send({ net_profit: 100 }); // no editReason

			expect(response.status).toBe(400);
		});

		it("PUT with editReason shorter than 3 chars → 400", async () => {
			const response = await request(app)
				.put("/api/sports-betting/b1")
				.set("Authorization", authHeader)
				.send({ net_profit: 100, editReason: "ab" });

			expect(response.status).toBe(400);
		});
	});

	// ── RBAC (Negative Path) ─────────────────────────────────────────────────────

	describe("RBAC (Role-Based Access Control)", () => {
		it("Staff token on POST → 403", async () => {
			vi.mocked(db.collection).mockImplementation((path: string) => {
				if (path === "users") return mockUsers("staff");
				// biome-ignore lint/suspicious/noExplicitAny: Firestore mock
				return { doc: vi.fn().mockReturnValue({ id: "b-new" }) } as any;
			});

			const response = await request(app)
				.post("/api/sports-betting")
				.set("Authorization", authHeader)
				.send({ net_profit: 75 });

			expect(response.status).toBe(403);
		});

		it("Staff token on PUT → 403", async () => {
			vi.mocked(db.collection).mockImplementation((path: string) => {
				if (path === "users") return mockUsers("staff");
				// biome-ignore lint/suspicious/noExplicitAny: Firestore mock
				return { doc: vi.fn().mockReturnValue({ id: "b1" }) } as any;
			});

			const response = await request(app)
				.put("/api/sports-betting/b1")
				.set("Authorization", authHeader)
				.send({ net_profit: 100, editReason: "Test reason" });

			expect(response.status).toBe(403);
		});

		it("Staff token on DELETE → 403", async () => {
			vi.mocked(db.collection).mockImplementation((path: string) => {
				if (path === "users") return mockUsers("staff");
				// biome-ignore lint/suspicious/noExplicitAny: Firestore mock
				return { doc: vi.fn().mockReturnValue({ id: "b1" }) } as any;
			});

			const response = await request(app)
				.delete("/api/sports-betting/b1")
				.set("Authorization", authHeader)
				.send({ deleteReason: "Test reason" });

			expect(response.status).toBe(403);
		});

		it("Unauthenticated request → 401", async () => {
			const response = await request(app)
				.post("/api/sports-betting")
				.send({ net_profit: 75 });

			expect(response.status).toBe(401);
		});
	});

	// ── Audit Log Assertions ─────────────────────────────────────────────────────

	describe("Audit Log Assertions", () => {
		it("createSportsBetting writes a CREATE audit log with correct fields", async () => {
			let capturedAuditData: Record<string, unknown> | null = null;

			const txMock = {
				runTransaction: vi
					.fn()
					.mockImplementation(
						async (fn: (t: Record<string, unknown>) => Promise<void>) => {
							const t = {
								set: vi
									.fn()
									.mockImplementation(
										(_ref: unknown, data: Record<string, unknown>) => {
											if (
												(data as Record<string, unknown>).action === "CREATE"
											) {
												capturedAuditData = data;
											}
										},
									),
								get: vi.fn(),
								update: vi.fn(),
								delete: vi.fn(),
							};
							await fn(t);
						},
					),
			};

			vi.mocked(db.collection).mockImplementation((path: string) => {
				if (path === "users") return mockUsers("manager");
				// biome-ignore lint/suspicious/noExplicitAny: Firestore mock
				return { doc: vi.fn().mockReturnValue({ id: "b-new" }) } as any;
			});
			vi.mocked(db.runTransaction).mockImplementation(txMock.runTransaction);

			await request(app)
				.post("/api/sports-betting")
				.set("Authorization", authHeader)
				.send({ net_profit: 80 });

			expect(capturedAuditData).not.toBeNull();
			expect(capturedAuditData?.action).toBe("CREATE");
			expect(capturedAuditData?.table_affected).toBe("sports_betting_logs");
		});
	});
});
