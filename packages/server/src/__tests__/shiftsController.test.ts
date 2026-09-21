import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
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
					// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
					const chainable: any = {
						where: vi.fn().mockReturnThis(),
						orderBy: vi.fn().mockReturnThis(),
						get: vi.fn().mockResolvedValue({
							docs: [
								{ id: "s1", data: () => ({ status: "OPEN" }) },
								{ id: "s2", data: () => ({ status: "CLOSED" }) },
							],
						}),
					};
					return chainable;
				}
				// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				const defaultChainable: any = {
					where: vi.fn().mockReturnThis(),
					orderBy: vi.fn().mockReturnThis(),
					get: vi.fn().mockResolvedValue({ docs: [] }),
				};
				return defaultChainable;
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
					// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
					const chainable: any = {
						where: vi.fn().mockReturnThis(),
						orderBy: vi.fn().mockReturnThis(),
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
					};
					return chainable;
				}
				// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				const defaultChainable: any = {
					where: vi.fn().mockReturnThis(),
					orderBy: vi.fn().mockReturnThis(),
					get: vi.fn().mockResolvedValue({ docs: [] }),
				};
				return defaultChainable;
			});

			const response = await request(app)
				.get("/api/shifts")
				.set("Authorization", authHeader);

			expect(response.status).toBe(200);
			expect(staleShiftRef.update).toHaveBeenCalledWith({ status: "MISSED" });
		});

		it("getMissedData does NOT auto-open a shift (ACP-011: side-effect removed)", async () => {
			// Verifies the side-effect was removed from getMissedData.
			// Even with no gaps and no missed shifts, the response must NOT contain
			// newlyOpenedShift and runTransaction must NOT be called.
			vi.mocked(db.collection).mockImplementation((path: string) => {
				if (path === "shifts") {
					return {
						where: vi.fn().mockReturnThis(),
						orderBy: vi.fn().mockReturnThis(),
						limit: vi.fn().mockReturnThis(),
						get: vi.fn().mockResolvedValue({ empty: true, docs: [] }),
						doc: vi.fn().mockReturnValue({ id: "should-never-be-used" }),

						// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
					} as any;
				}

				// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				return { doc: vi.fn().mockReturnValue({ id: "audit" }) } as any;
			});

			const response = await request(app)
				.get("/api/shifts/missed")
				.set("Authorization", authHeader);

			expect(response.status).toBe(200);
			// newlyOpenedShift must NOT be present in the response.
			expect(response.body).not.toHaveProperty("newlyOpenedShift");
			// runTransaction must NOT have been called from getMissedData.
			expect(db.runTransaction).not.toHaveBeenCalled();
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
						where: vi
							.fn()
							.mockImplementation(
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
								},
							),
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
			// ACP-011: newlyOpenedShift no longer returned by getMissedData.
			expect(response.body).not.toHaveProperty("newlyOpenedShift");
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
			expect(response.body.error).toContain(
				"Float amount must be a valid number",
			);
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

		it("should return 400 when closing a shift without actualCashCounted", async () => {
			const response = await request(app)
				.post("/api/shifts/shift-1/close")
				.set("Authorization", authHeader)
				.send({});

			expect(response.status).toBe(400);
			expect(response.body.error).toContain(
				"Actual cash counted must be a valid number",
			);
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

		it("should return 404 when shift document exists but data is empty", async () => {
			vi.mocked(db.collection).mockImplementation((path: string) => {
				if (path === "shifts") {
					return {
						doc: () => ({
							get: vi.fn().mockResolvedValue({
								exists: true,
								data: () => null,
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
				.post("/api/shifts/empty-data/close")
				.set("Authorization", authHeader)
				.send({ actualCashCounted: 100 });

			expect(response.status).toBe(404);
			expect(response.body.error).toBe("Shift data empty");
		});

		it("should return 404 when updating float on a non-existent shift", async () => {
			vi.mocked(db.collection).mockImplementation((path: string) => {
				if (path === "shifts") {
					return {
						doc: vi.fn().mockReturnValue({ id: "missing-shift" }),
						// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
					} as any;
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
					return {
						doc: vi.fn().mockReturnValue({ id: "closed-shift" }),
						// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
					} as any;
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
			expect(response.body.error).toBe(
				"Only open shifts can have their float updated",
			);
		});
	});

	describe("Database Crash (500 fallback)", () => {
		it("returns 500 when listing shifts crashes", async () => {
			vi.mocked(db.collection).mockImplementation((path: string) => {
				if (path === "shifts") {
					// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
					const chainable: any = {
						where: vi.fn().mockReturnThis(),
						orderBy: vi.fn().mockReturnThis(),
						get: vi.fn().mockRejectedValue(new Error("DB crashed")),
					};
					return chainable;
				}
				// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				const defaultChainable: any = {
					where: vi.fn().mockReturnThis(),
					orderBy: vi.fn().mockReturnThis(),
					get: vi.fn().mockResolvedValue({ docs: [] }),
				};
				return defaultChainable;
			});

			const response = await request(app)
				.get("/api/shifts")
				.set("Authorization", authHeader);

			expect(response.status).toBe(500);
			expect(response.body.error).toBe("Internal server error");
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

		it("returns 500 when starting a shift crashes on the open-shift query", async () => {
			vi.mocked(db.collection).mockImplementation((path: string) => {
				if (path === "shifts") {
					return {
						where: vi.fn().mockReturnThis(),
						get: vi.fn().mockRejectedValue(new Error("DB crashed")),

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

			expect(response.status).toBe(500);
			expect(response.body.error).toBe("Internal server error");
		});

		it("returns 500 when starting a shift crashes inside the transaction", async () => {
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

			vi.mocked(db.runTransaction).mockRejectedValueOnce(
				new Error("DB crashed"),
			);

			const response = await request(app)
				.post("/api/shifts")
				.set("Authorization", authHeader)
				.send({ floatAmount: 150, managerName: "Test Manager" });

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

		it("returns 401 without a bearer token on auto-open POST", async () => {
			const response = await request(app).post("/api/shifts/auto-open");
			expect(response.status).toBe(401);
		});
	});

	describe("Auto-Open Shift (ACP-011 Option B)", () => {
		it("returns 201 and creates a shift when state is clean", async () => {
			vi.mocked(db.collection).mockImplementation((path: string) => {
				if (path === "shifts") {
					return {
						where: vi.fn().mockReturnThis(),
						get: vi.fn().mockResolvedValue({ empty: true, docs: [] }),
						doc: vi.fn().mockReturnValue({ id: "auto-shift-001" }),

						// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
					} as any;
				}
				// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				return { doc: vi.fn().mockReturnValue({ id: "audit-001" }) } as any;
			});

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
				.post("/api/shifts/auto-open")
				.set("Authorization", authHeader)
				.send({ floatAmount: 150, managerName: "Night Manager" });

			expect(response.status).toBe(201);
			expect(response.body.status).toBe("OPEN");
			expect(response.body.opening_float).toBe(150);
			expect(response.body.manager_name).toBe("Night Manager");
			// D2 fix: manager_name must NOT be an email address.
			expect(response.body.manager_name).not.toMatch(/@/);
		});

		it("returns 409 when an open shift already exists (D5 no-op path)", async () => {
			vi.mocked(db.collection).mockImplementation((path: string) => {
				if (path === "shifts") {
					return {
						where: vi.fn().mockReturnThis(),
						get: vi.fn().mockResolvedValue({ empty: true, docs: [] }),
						doc: vi.fn().mockReturnValue({ id: "ignored" }),

						// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
					} as any;
				}
				// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				return { doc: vi.fn().mockReturnValue({ id: "audit" }) } as any;
			});

			// Transaction finds an existing open shift — callback returns null.
			vi.mocked(db.runTransaction).mockImplementationOnce(async (cb) => {
				const mockTx = {
					get: vi.fn().mockResolvedValue({ empty: false, docs: [{}] }),
					set: vi.fn(),
					update: vi.fn(),
					delete: vi.fn(),
				};
				// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				return await cb(mockTx as any);
			});

			const response = await request(app)
				.post("/api/shifts/auto-open")
				.set("Authorization", authHeader)
				.send({ floatAmount: 0, managerName: "Day Manager" });

			expect(response.status).toBe(409);
			expect(response.body.error).toMatch(/already open/i);
		});

		it("returns 409 when a shift was already closed today (D4 guard)", async () => {
			const todayIso = new Date().toISOString();
			vi.mocked(db.collection).mockImplementation((path: string) => {
				if (path === "shifts") {
					return {
						where: vi.fn().mockReturnThis(),
						get: vi.fn().mockResolvedValue({
							empty: false,
							docs: [
								{ data: () => ({ status: "CLOSED", start_time: todayIso }) },
							],
						}),

						// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
					} as any;
				}
				// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				return { doc: vi.fn().mockReturnValue({ id: "audit" }) } as any;
			});

			const response = await request(app)
				.post("/api/shifts/auto-open")
				.set("Authorization", authHeader)
				.send({ floatAmount: 0, managerName: "Day Manager" });

			expect(response.status).toBe(409);
			expect(response.body.error).toMatch(/already closed today/i);
			// D4 fix: transaction must NOT be called; guard fires before it.
			expect(db.runTransaction).not.toHaveBeenCalled();
		});

		it("returns 400 when floatAmount is missing (schema validation)", async () => {
			const response = await request(app)
				.post("/api/shifts/auto-open")
				.set("Authorization", authHeader)
				.send({ managerName: "Day Manager" }); // floatAmount absent

			expect(response.status).toBe(400);
		});

		it("returns 400 when managerName is missing (schema validation)", async () => {
			const response = await request(app)
				.post("/api/shifts/auto-open")
				.set("Authorization", authHeader)
				.send({ floatAmount: 100 }); // managerName absent

			expect(response.status).toBe(400);
		});
	});
});
