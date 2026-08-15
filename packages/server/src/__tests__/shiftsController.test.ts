import request from "supertest";
import { describe, expect, it, vi, beforeEach } from "vitest";
import "./setupTests.js";
import app from "../app.js";

const { db } = await import("../firebase.js");

describe("Shifts Integration Tests", () => {
	const authHeader = "Bearer valid-mock-token";

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("Golden Path (Success Scenarios)", () => {
		it("should successfully open a new shift", async () => {
			vi.mocked(db.collection).mockImplementation((path: string) => {
				if (path === "shifts") {
					return {
						where: vi.fn().mockReturnThis(),
						get: vi.fn().mockResolvedValue({ empty: true, docs: [] }),
						doc: vi.fn().mockReturnValue({ id: "new-shift-123" }),

					// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
					} as any;
				}

				// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				return { doc: vi.fn().mockReturnValue({ id: "audit-123" }) } as any;
			});

			const response = await request(app)
				.post("/api/shifts")
				.set("Authorization", authHeader)
				.send({ floatAmount: 150, managerName: "Test Manager" });

			expect(response.status).toBe(201);
		});

		it("should successfully update an opening float on an OPEN shift", async () => {
			const response = await request(app)
				.put("/api/shifts/shift-123/float")
				.set("Authorization", authHeader)
				.send({ floatAmount: 200 });

			expect(response.status).toBe(200);
		});

		it("should successfully close a shift with valid variance calculation", async () => {
			vi.mocked(db.collection).mockImplementation((path: string) => {
				if (path === "shifts") {
					return {
						doc: () => ({
							get: vi.fn().mockResolvedValue({
								exists: true,
								data: () => ({
									status: "OPEN",
									start_time: "2026-08-01T10:00:00Z",
									opening_float: 100,
								}),
							}),
							update: vi.fn(),
						}),

					// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
					} as any;
				}
				return {
					where: vi.fn().mockReturnThis(),
					get: vi.fn().mockResolvedValue({ docs: [] }),

				// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				} as any;
			});

			const response = await request(app)
				.post("/api/shifts/shift-123/close")
				.set("Authorization", authHeader)
				.send({ actualCashCounted: 100 });

			expect(response.status).toBe(200);
		});

		it("should successfully close a shift with dependent data reducing into expected cash", async () => {
			vi.mocked(db.collection).mockImplementation((path: string) => {
				if (path === "shifts") {
					return {
						doc: () => ({
							get: vi.fn().mockResolvedValue({
								exists: true,
								data: () => ({
									status: "OPEN",
									start_time: "2026-08-01T10:00:00Z",
									opening_float: 100,
								}),
							}),
							update: vi.fn(),
						}),

					// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
					} as any;
				}
				if (path === "game_sales_logs") {
					return {
						where: () => ({
							get: vi.fn().mockResolvedValue({
								docs: [{ data: () => ({ calculated_total: 200 }) }],
							}),
						}),

					// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
					} as any;
				}
				if (path === "keno_logs") {
					return {
						where: () => ({
							get: vi.fn().mockResolvedValue({
								docs: [{ data: () => ({ net_profit: 50 }) }],
							}),
						}),

					// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
					} as any;
				}
				if (path === "credits") {
					return {
						where: () => ({
							get: vi.fn().mockResolvedValue({
								docs: [{ data: () => ({ status: "Pending", amount: 30 }) }],
							}),
						}),

					// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
					} as any;
				}
				if (path === "expenses") {
					return {
						where: () => ({
							get: vi.fn().mockResolvedValue({
								docs: [{ data: () => ({ amount: 20 }) }],
							}),
						}),

					// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
					} as any;
				}
				return {
					where: vi.fn().mockReturnThis(),
					get: vi.fn().mockResolvedValue({ docs: [] }),

				// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				} as any;
			});

			const response = await request(app)
				.post("/api/shifts/shift-123/close")
				.set("Authorization", authHeader)
				.send({ actualCashCounted: 300 }); // opening 100 + sales 200 + keno 50 - expenses 20 - credits 30

			expect(response.status).toBe(200);
			expect(response.body.data.expected_cash_calculated).toBe(300);
			expect(response.body.data.variance).toBe(0);
		});

		it("should successfully list shifts", async () => {
			vi.mocked(db.collection).mockImplementation((path: string) => {
				if (path === "shifts") {
					return {
						where: () => ({
							get: vi.fn().mockResolvedValue({ docs: [] }),
						}),
						get: vi.fn().mockResolvedValue({
							docs: [
								{ id: "s1", data: () => ({ status: "OPEN" }) },
								{ id: "s2", data: () => ({ status: "CLOSED" }) },
							],
						}),

					// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
					} as any;
				}
				return {
					where: vi.fn().mockReturnThis(),
					get: vi.fn().mockResolvedValue({ docs: [] }),

				// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				} as any;
			});

			const response = await request(app)
				.get("/api/shifts")
				.set("Authorization", authHeader);

			expect(response.status).toBe(200);
			expect(response.body).toHaveLength(2);
		});

		it("should auto-label a stale OPEN shift as MISSED during list (M-27 behavior)", async () => {
			const staleShiftRef = { update: vi.fn().mockResolvedValue(true) };
			const yesterday = new Date(Date.now() - 48 * 60 * 60 * 1000);

			vi.mocked(db.collection).mockImplementation((path: string) => {
				if (path === "shifts") {
					return {
						where: () => ({
							get: vi.fn().mockResolvedValue({
								docs: [
									{
										ref: staleShiftRef,
										data: () => ({
											status: "OPEN",
											start_time: yesterday.toISOString(),
										}),
									},
								],
							}),
						}),
						get: vi.fn().mockResolvedValue({ docs: [] }),

					// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
					} as any;
				}
				return {
					where: vi.fn().mockReturnThis(),
					get: vi.fn().mockResolvedValue({ docs: [] }),

				// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				} as any;
			});

			const response = await request(app)
				.get("/api/shifts")
				.set("Authorization", authHeader);

			expect(response.status).toBe(200);
			expect(staleShiftRef.update).toHaveBeenCalledWith({ status: "MISSED" });
		});

		it("should auto-generate a new OPEN shift in getMissedData if no gaps exist (M-29 behavior)", async () => {
			vi.mocked(db.collection).mockImplementation((path: string) => {
				if (path === "shifts") {
					return {
						where: vi.fn().mockReturnThis(),
						orderBy: vi.fn().mockReturnThis(),
						limit: vi.fn().mockReturnThis(),
						get: vi.fn().mockResolvedValue({ empty: true, docs: [] }),
						doc: vi.fn().mockReturnValue({ id: "auto-opened-123" }),

					// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
					} as any;
				}

				// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				return { doc: vi.fn().mockReturnValue({ id: "audit" }) } as any;
			});

			// Override runTransaction specifically to yield empty for the openShiftsQuery
			vi.mocked(db.runTransaction).mockImplementationOnce(async (cb) => {
				const mockTx = {
					get: vi.fn().mockResolvedValue({ empty: true }),
					set: vi.fn(),
					update: vi.fn(),
					delete: vi.fn(),
				};
				// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				return await cb(mockTx as any);
			});

			const response = await request(app)
				.get("/api/shifts/missed")
				.set("Authorization", authHeader);

			expect(response.status).toBe(200);
			expect(response.body.newlyOpenedShift).toMatchObject({
				id: "auto-opened-123",
				status: "OPEN",
			});
		});

		it("should return missed shifts and unresolved gap dates when gaps exist", async () => {
			const lastShiftDate = new Date();
			lastShiftDate.setDate(lastShiftDate.getDate() - 3);
			const expectedGaps: string[] = [];
			const checkDate = new Date(lastShiftDate);
			checkDate.setDate(checkDate.getDate() + 1);
			while (
				checkDate.toLocaleDateString("en-CA") <
				new Date().toLocaleDateString("en-CA")
			) {
				expectedGaps.push(checkDate.toLocaleDateString("en-CA"));
				checkDate.setDate(checkDate.getDate() + 1);
			}

			vi.mocked(db.collection).mockImplementation((path: string) => {
				if (path === "shifts") {
					return {
						where: vi.fn().mockImplementation(
							(_field: string, _op: string, value: string) => {
							if (value === "MISSED") {
								return {
									get: vi.fn().mockResolvedValue({
										docs: [
											{
												id: "missed-1",
												data: () => ({ status: "MISSED" }),
											},
										],
									}),
								};
							}
							return { get: vi.fn().mockResolvedValue({ docs: [] }) };
						}),
						orderBy: vi.fn().mockReturnThis(),
						limit: vi.fn().mockReturnThis(),
						get: vi.fn().mockResolvedValue({
							empty: false,
							docs: [
								{
									id: "last-shift",
									data: () => ({ start_time: lastShiftDate.toISOString() }),
								},
							],
						}),

					// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
					} as any;
				}
				if (path === "missed_day_resolutions") {
					return {
						where: vi.fn().mockReturnThis(),
						get: vi.fn().mockResolvedValue({
							docs: [{ data: () => ({ date: expectedGaps[0] }) }],
						}),

					// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
					} as any;
				}
				return {
					where: vi.fn().mockReturnThis(),
					get: vi.fn().mockResolvedValue({ docs: [] }),

				// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				} as any;
			});

			const response = await request(app)
				.get("/api/shifts/missed")
				.set("Authorization", authHeader);

			expect(response.status).toBe(200);
			expect(response.body.missedShifts).toHaveLength(1);
			expect(response.body.missedShifts[0].id).toBe("missed-1");
			expect(response.body.gapDates).toEqual(expectedGaps.slice(1));
			expect(response.body.newlyOpenedShift).toBeNull();
		});

		it("should resolve a gap day as SHOP_CLOSED", async () => {
			const setMock = vi.fn().mockResolvedValue(true);
			vi.mocked(db.collection).mockImplementation((path: string) => {
				if (path === "missed_day_resolutions") {

					// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
					return { doc: vi.fn().mockReturnValue({ id: "res-1", set: setMock }) } as any;
				}

				// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				return { doc: vi.fn().mockReturnValue({ id: "audit" }) } as any;
			});

			const response = await request(app)
				.post("/api/shifts/resolve-missed")
				.set("Authorization", authHeader)
				.send({ date: "2026-08-10", status: "SHOP_CLOSED" });

			expect(response.status).toBe(200);
			expect(response.body.message).toBe("Resolved successfully");
			expect(setMock).toHaveBeenCalledWith(
				expect.objectContaining({
					status: "SHOP_CLOSED",
					variance: 0,
					resolved_by_id: "mock-admin-uid",
				}),
			);
		});

		it("should resolve a gap day as DATA_FILLED with computed variance", async () => {
			const setMock = vi.fn().mockResolvedValue(true);
			vi.mocked(db.collection).mockImplementation((path: string) => {
				if (path === "missed_day_resolutions") {

					// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
					return { doc: vi.fn().mockReturnValue({ id: "res-2", set: setMock }) } as any;
				}

				// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				return { doc: vi.fn().mockReturnValue({ id: "audit" }) } as any;
			});

			const response = await request(app)
				.post("/api/shifts/resolve-missed")
				.set("Authorization", authHeader)
				.send({
					date: "2026-08-11",
					status: "DATA_FILLED",
					expected_cash_calculated: 100,
					actual_cash_counted: 120,
				});

			expect(response.status).toBe(200);
			expect(setMock).toHaveBeenCalledWith(
				expect.objectContaining({ variance: 20 }),
			);
		});
	});

	describe("Negative Path (Rejection Scenarios)", () => {
		it("should return 401 if authorization header is missing", async () => {
			const response = await request(app)
				.post("/api/shifts")
				.send({ floatAmount: 100 });
			expect(response.status).toBe(401);
		});

		it("should return 400 when floatAmount is negative on shift start (Zod Validation)", async () => {
			const response = await request(app)
				.post("/api/shifts")
				.set("Authorization", authHeader)
				.send({ floatAmount: -50 });
			expect(response.status).toBe(400);
		});

		it("should return 400 when floatAmount is missing on updateFloat (Zod Validation)", async () => {
			const response = await request(app)
				.put("/api/shifts/shift-123/float")
				.set("Authorization", authHeader)
				.send({});
			expect(response.status).toBe(400);
			expect(response.body.error).toContain("Float amount must be a valid number");
		});

		it("should return 400 if an active shift is already open", async () => {
			vi.mocked(db.collection).mockImplementation((path: string) => {
				if (path === "shifts") {
					return {
						where: vi.fn().mockReturnThis(),
						get: vi.fn().mockResolvedValue({
							empty: false,
							docs: [{ id: "open-1" }],
						}),

					// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
					} as any;
				}

				// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				return { doc: vi.fn().mockReturnValue({ id: "audit" }) } as any;
			});

			const response = await request(app)
				.post("/api/shifts")
				.set("Authorization", authHeader)
				.send({ floatAmount: 150, managerName: "Test Manager" });

			expect(response.status).toBe(400);
			expect(response.body.error).toContain("An active shift is already open");
		});

		it("should return 400 if closing a shift with > $2 variance without a reason", async () => {
			vi.mocked(db.collection).mockImplementation((path: string) => {
				if (path === "shifts") {
					return {
						doc: () => ({
							get: vi.fn().mockResolvedValue({
								exists: true,
								data: () => ({
									status: "OPEN",
									start_time: "2026-08-01T10:00:00Z",
									opening_float: 100,
								}),
							}),
							update: vi.fn(),
						}),

					// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
					} as any;
				}
				return {
					where: vi.fn().mockReturnThis(),
					get: vi.fn().mockResolvedValue({ docs: [] }),

				// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				} as any;
			});

			const response = await request(app)
				.post("/api/shifts/shift-123/close")
				.set("Authorization", authHeader)
				.send({ actualCashCounted: 50 }); // Variance = 50

			expect(response.status).toBe(400);
			expect(response.body.error).toContain("Variance is greater than $2.00");
		});

		it("should return 404 when closing a non-existent shift", async () => {
			vi.mocked(db.collection).mockImplementation((path: string) => {
				if (path === "shifts") {
					return {
						doc: () => ({
							get: vi.fn().mockResolvedValue({ exists: false }),
						}),

					// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
					} as any;
				}
				return {
					where: vi.fn().mockReturnThis(),
					get: vi.fn().mockResolvedValue({ docs: [] }),

				// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				} as any;
			});

			const response = await request(app)
				.post("/api/shifts/missing/close")
				.set("Authorization", authHeader)
				.send({ actualCashCounted: 100 });

			expect(response.status).toBe(404);
			expect(response.body.error).toBe("Shift not found");
		});

		it("should return 400 when closing an already-closed shift", async () => {
			vi.mocked(db.collection).mockImplementation((path: string) => {
				if (path === "shifts") {
					return {
						doc: () => ({
							get: vi.fn().mockResolvedValue({
								exists: true,
								data: () => ({ status: "CLOSED" }),
							}),
						}),

					// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
					} as any;
				}
				return {
					where: vi.fn().mockReturnThis(),
					get: vi.fn().mockResolvedValue({ docs: [] }),

				// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				} as any;
			});

			const response = await request(app)
				.post("/api/shifts/closed-1/close")
				.set("Authorization", authHeader)
				.send({ actualCashCounted: 100 });

			expect(response.status).toBe(400);
			expect(response.body.error).toBe("Shift is already closed");
		});

		it("should return 404 when updating float on a non-existent shift", async () => {
			vi.mocked(db.collection).mockImplementation((path: string) => {
				if (path === "shifts") {

					// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
					return { doc: vi.fn().mockReturnValue({ id: "missing-shift" }) } as any;
				}

				// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				return { doc: vi.fn().mockReturnValue({ id: "audit" }) } as any;
			});

			vi.mocked(db.runTransaction).mockImplementationOnce(async (cb) => {
				const mockTx = {
					get: vi.fn().mockResolvedValue({ exists: false }),
					set: vi.fn(),
					update: vi.fn(),
					delete: vi.fn(),
				};
				// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				return await cb(mockTx as any);
			});

			const response = await request(app)
				.put("/api/shifts/missing-shift/float")
				.set("Authorization", authHeader)
				.send({ floatAmount: 200 });

			expect(response.status).toBe(404);
			expect(response.body.error).toBe("Shift not found");
		});

		it("should return 400 when updating float on a non-OPEN shift", async () => {
			vi.mocked(db.collection).mockImplementation((path: string) => {
				if (path === "shifts") {

					// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
					return { doc: vi.fn().mockReturnValue({ id: "closed-shift" }) } as any;
				}

				// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				return { doc: vi.fn().mockReturnValue({ id: "audit" }) } as any;
			});

			vi.mocked(db.runTransaction).mockImplementationOnce(async (cb) => {
				const mockTx = {
					get: vi.fn().mockResolvedValue({
						exists: true,
						data: () => ({ status: "CLOSED" }),
					}),
					set: vi.fn(),
					update: vi.fn(),
					delete: vi.fn(),
				};
				// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				return await cb(mockTx as any);
			});

			const response = await request(app)
				.put("/api/shifts/closed-shift/float")
				.set("Authorization", authHeader)
				.send({ floatAmount: 200 });

			expect(response.status).toBe(400);
			expect(response.body.error).toBe("Only open shifts can have their float updated");
		});

		it("should return 400 for invalid missed-day status (Zod Validation)", async () => {
			const response = await request(app)
				.post("/api/shifts/resolve-missed")
				.set("Authorization", authHeader)
				.send({ date: "2026-08-10", status: "INVALID_STATUS" });

			expect(response.status).toBe(400);
			expect(response.body.error).toContain(
				"Status must be 'SHOP_CLOSED' or 'DATA_FILLED'",
			);
		});

		it("should return 400 when resolve-missed is missing the date (Zod Validation)", async () => {
			const response = await request(app)
				.post("/api/shifts/resolve-missed")
				.set("Authorization", authHeader)
				.send({ status: "SHOP_CLOSED" });

			expect(response.status).toBe(400);
		});
	});

	describe("Database Crash (500 fallback)", () => {
		it("returns 500 when listing shifts crashes", async () => {
			vi.mocked(db.collection).mockImplementation((path: string) => {
				if (path === "shifts") {
					return {
						where: () => ({
							get: vi.fn().mockResolvedValue({ docs: [] }),
						}),
						get: vi.fn().mockRejectedValue(new Error("DB crashed")),

					// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
					} as any;
				}
				return {
					where: vi.fn().mockReturnThis(),
					get: vi.fn().mockResolvedValue({ docs: [] }),

				// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				} as any;
			});

			const response = await request(app)
				.get("/api/shifts")
				.set("Authorization", authHeader);

			expect(response.status).toBe(500);
			expect(response.body.error).toBe("DB crashed");
		});

		it("returns 500 when closing a shift crashes on DB read", async () => {
			vi.mocked(db.collection).mockImplementation((path: string) => {
				if (path === "shifts") {
					return {
						doc: () => ({
							get: vi.fn().mockRejectedValue(new Error("DB crashed")),
						}),

					// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
					} as any;
				}
				return {
					where: vi.fn().mockReturnThis(),
					get: vi.fn().mockResolvedValue({ docs: [] }),

				// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				} as any;
			});

			const response = await request(app)
				.post("/api/shifts/shift-1/close")
				.set("Authorization", authHeader)
				.send({ actualCashCounted: 100 });

			expect(response.status).toBe(500);
			expect(response.body.error).toBe("Internal server error");
		});

		it("returns 500 when updateFloat crashes inside the transaction", async () => {
			vi.mocked(db.collection).mockImplementation((path: string) => {
				if (path === "shifts") {

					// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
					return { doc: vi.fn().mockReturnValue({ id: "shift-1" }) } as any;
				}

				// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				return { doc: vi.fn().mockReturnValue({ id: "audit" }) } as any;
			});

			vi.mocked(db.runTransaction).mockRejectedValueOnce(
				new Error("DB crashed"),
			);

			const response = await request(app)
				.put("/api/shifts/shift-1/float")
				.set("Authorization", authHeader)
				.send({ floatAmount: 200 });

			expect(response.status).toBe(500);
			expect(response.body.error).toBe("Internal server error");
		});

		it("returns 500 when getMissedData crashes on DB read", async () => {
			vi.mocked(db.collection).mockImplementation((path: string) => {
				if (path === "shifts") {
					return {
						where: vi.fn().mockReturnThis(),
						orderBy: vi.fn().mockReturnThis(),
						limit: vi.fn().mockReturnThis(),
						get: vi.fn().mockRejectedValue(new Error("DB crashed")),

					// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
					} as any;
				}
				return {
					where: vi.fn().mockReturnThis(),
					get: vi.fn().mockResolvedValue({ docs: [] }),

				// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				} as any;
			});

			const response = await request(app)
				.get("/api/shifts/missed")
				.set("Authorization", authHeader);

			expect(response.status).toBe(500);
			expect(response.body.error).toBe("Internal server error");
		});

		it("returns 500 when resolving missed data crashes", async () => {
			vi.mocked(db.collection).mockImplementation((path: string) => {
				if (path === "missed_day_resolutions") {
					return {
						doc: vi.fn().mockReturnValue({
							id: "res-1",
							set: vi.fn().mockRejectedValue(new Error("DB crashed")),
						}),

					// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
					} as any;
				}

				// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				return { doc: vi.fn().mockReturnValue({ id: "audit" }) } as any;
			});

			const response = await request(app)
				.post("/api/shifts/resolve-missed")
				.set("Authorization", authHeader)
				.send({ date: "2026-08-10", status: "SHOP_CLOSED" });

			expect(response.status).toBe(500);
			expect(response.body.error).toBe("Internal server error");
		});
	});

	describe("Unauthorized (missing credentials)", () => {
		it("returns 401 without a bearer token on GET", async () => {
			const response = await request(app).get("/api/shifts");
			expect(response.status).toBe(401);
		});

		it("returns 401 without a bearer token on missed-data GET", async () => {
			const response = await request(app).get("/api/shifts/missed");
			expect(response.status).toBe(401);
		});

		it("returns 401 without a bearer token on resolve-missed POST", async () => {
			const response = await request(app)
				.post("/api/shifts/resolve-missed")
				.send({ date: "2026-08-10", status: "SHOP_CLOSED" });
			expect(response.status).toBe(401);
		});
	});
});
