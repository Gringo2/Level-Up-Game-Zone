import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import "./setupTests.js";
import app from "../app.js";

const { db } = await import("../firebase.js");

describe("Employees Integration Tests", () => {
	const authHeader = "Bearer valid-mock-token";

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("Golden Path (Success Scenarios)", () => {
		it("should successfully list employees", async () => {
			vi.mocked(db.collection).mockImplementation((path: string) => {
				if (path === "employees") {
					return {
						get: vi.fn().mockResolvedValue({
							docs: [
								{
									id: "emp1",
									data: () => ({ name: "Alice", position: "Cashier" }),
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
				.get("/api/employees")
				.set("Authorization", authHeader);

			expect(response.status).toBe(200);
			expect(response.body).toHaveLength(1);
			expect(response.body[0].name).toBe("Alice");
		});

		it("should successfully create an employee", async () => {
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
				if (path === "employees") {
					return {
						get: vi.fn().mockResolvedValue({ docs: [] }),
						doc: vi.fn().mockReturnValue({ id: "new-emp-123" }),
						// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
					} as any;
				}
				return {
					doc: vi.fn().mockReturnValue({ id: "audit-1" }),
					// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				} as any;
			});

			const response = await request(app)
				.post("/api/employees")
				.set("Authorization", authHeader)
				.send({
					name: "Bob",
					position: "Manager",
					base_salary: 3000,
					hired_date: "2026-01-01",
				});

			expect(response.status).toBe(201);
			expect(response.body.name).toBe("Bob");
		});

		it("should successfully update an employee", async () => {
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
						id: "emp-123",
						get: vi.fn().mockResolvedValue({
							id: "emp-123",
							data: () => ({
								name: "Bob",
								position: "Manager",
								base_salary: 3500,
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
						id: "emp-123",
						data: () => ({ name: "Bob", position: "Manager" }),
					}),
					set: vi.fn(),
					update: vi.fn(),
					delete: vi.fn(),
				};
				// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				return await cb(mockTx as any);
			});

			const response = await request(app)
				.put("/api/employees/emp-123")
				.set("Authorization", authHeader)
				.send({ base_salary: 3500, editReason: "Promotion" });

			expect(response.status).toBe(200);
			expect(response.body.id).toBe("emp-123");
			expect(response.body.base_salary).toBe(3500);
		});

		it("should successfully update an employee with all partial fields", async () => {
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
				if (path === "employees") {
					return {
						get: vi.fn().mockResolvedValue({
							docs: [
								{
									id: "emp-123",
									data: () => ({
										name: "Bob",
										isActive: true,
									}),
								},
							],
						}),
						doc: vi.fn().mockReturnValue({
							id: "emp-123",
							get: vi.fn().mockResolvedValue({
								id: "emp-123",
								data: () => ({
									name: "Robert",
									position: "Supervisor",
									base_salary: 3800,
									hired_date: "2025-06-01",
									break_day: "Saturday",
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
						id: "emp-123",
						data: () => ({ name: "Bob", position: "Manager" }),
					}),
					getAll: vi.fn().mockResolvedValue([
						{
							exists: true,
							id: "emp-123",
							data: () => ({ name: "Bob", isActive: true }),
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
				.put("/api/employees/emp-123")
				.set("Authorization", authHeader)
				.send({
					name: "Robert",
					position: "Supervisor",
					base_salary: 3800,
					hired_date: "2025-06-01",
					break_day: "Saturday",
					isActive: false,
					editReason: "Role change",
				});

			expect(response.status).toBe(200);
		});
	});

	describe("TD-041: employee deletion", () => {
		it("deletes an employee transactionally with an audit record", async () => {
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
					doc: vi.fn().mockReturnValue({ id: "emp-1" }),
					// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				} as any;
			});

			let capturedDelete = false;
			let capturedAudit: Record<string, unknown> | undefined;
			vi.mocked(db.runTransaction).mockImplementationOnce(async (cb) => {
				const mockTx = {
					get: vi.fn().mockResolvedValue({
						exists: true,
						id: "emp-1",
						data: () => ({ name: "Alice", isActive: true }),
					}),
					set: vi.fn((_ref: unknown, payload: Record<string, unknown>) => {
						capturedAudit = payload;
					}),
					update: vi.fn(),
					delete: vi.fn(() => {
						capturedDelete = true;
					}),
				};
				// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				return await cb(mockTx as any);
			});

			const response = await request(app)
				.delete("/api/employees/emp-1")
				.set("Authorization", authHeader)
				.send({ deleteReason: "Offboarded" });

			expect(response.status).toBe(200);
			expect(capturedDelete).toBe(true);
			expect(capturedAudit?.table_affected).toBe("employees");
			expect(capturedAudit?.action).toBe("DELETE");
			expect(capturedAudit?.reason_for_change).toBe("Offboarded");
		});

		it("returns 400 without a deleteReason (Zod)", async () => {
			const response = await request(app)
				.delete("/api/employees/emp-1")
				.set("Authorization", authHeader)
				.send({});

			expect(response.status).toBe(400);
			expect(response.body.error).toContain("Required");
		});

		it("staff cannot delete employees (403)", async () => {
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
					doc: vi.fn().mockReturnValue({ id: "emp-1" }),
					// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				} as any;
			});

			const response = await request(app)
				.delete("/api/employees/emp-1")
				.set("Authorization", authHeader)
				.send({ deleteReason: "Attempt" });

			expect(response.status).toBe(403);
		});

		it("returns 500 when deleting a non-existent employee (documented contract)", async () => {
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
					doc: vi.fn().mockReturnValue({ id: "missing" }),
					// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				} as any;
			});
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
				.delete("/api/employees/missing")
				.set("Authorization", authHeader)
				.send({ deleteReason: "Cleanup" });

			expect(response.status).toBe(500);
			expect(response.body.error).toContain("Employee not found");
		});

		it("returns 401 without credentials", async () => {
			const response = await request(app)
				.delete("/api/employees/emp-1")
				.send({ deleteReason: "No token" });

			expect(response.status).toBe(401);
		});
	});

	describe("Negative Path (Rejection Scenarios)", () => {
		it("should return 400 when creating employee with missing name (Zod)", async () => {
			const response = await request(app)
				.post("/api/employees")
				.set("Authorization", authHeader)
				.send({
					position: "Manager",
					base_salary: 3000,
					hired_date: "2026-01-01",
				}); // missing name

			expect(response.status).toBe(400);
			expect(response.body.error).toContain("Required");
		});

		it("should return 409 when creating employee with duplicate name", async () => {
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
				if (path === "employees") {
					return {
						get: vi.fn().mockResolvedValue({
							docs: [
								{
									id: "existing-emp",
									data: () => ({ name: "Bob", isActive: true }),
								},
							],
						}),
						doc: vi.fn().mockReturnValue({ id: "new-emp-123" }),
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
							id: "existing-emp",
							data: () => ({ name: "Bob", isActive: true }),
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
				.post("/api/employees")
				.set("Authorization", authHeader)
				.send({
					name: "Bob",
					position: "Manager",
					base_salary: 3000,
					hired_date: "2026-01-01",
				});

			expect(response.status).toBe(409);
			expect(response.body.error).toContain("already exists");
		});

		it("should return 409 when creating employee with case-insensitive duplicate name", async () => {
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
				if (path === "employees") {
					return {
						get: vi.fn().mockResolvedValue({
							docs: [
								{
									id: "existing-emp",
									data: () => ({ name: "Bob", isActive: true }),
								},
							],
						}),
						doc: vi.fn().mockReturnValue({ id: "new-emp-123" }),
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
							id: "existing-emp",
							data: () => ({ name: "Bob", isActive: true }),
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
				.post("/api/employees")
				.set("Authorization", authHeader)
				.send({
					name: "  bob  ",
					position: "Manager",
					base_salary: 3000,
					hired_date: "2026-01-01",
				});

			expect(response.status).toBe(409);
			expect(response.body.error).toContain("already exists");
		});

		it("should allow creating employee if duplicate is inactive", async () => {
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
				if (path === "employees") {
					return {
						get: vi.fn().mockResolvedValue({
							docs: [
								{
									id: "existing-emp",
									data: () => ({ name: "Bob", isActive: false }),
								},
							],
						}),
						doc: vi.fn().mockReturnValue({ id: "new-emp-123" }),
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
							id: "existing-emp",
							data: () => ({ name: "Bob", isActive: false }),
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
				.post("/api/employees")
				.set("Authorization", authHeader)
				.send({
					name: "Bob",
					position: "Manager",
					base_salary: 3000,
					hired_date: "2026-01-01",
				});

			expect(response.status).toBe(201);
			expect(response.body.name).toBe("Bob");
		});

		it("should return 409 when updating employee name to a duplicate", async () => {
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
				if (path === "employees") {
					return {
						get: vi.fn().mockResolvedValue({
							docs: [
								{
									id: "emp-123",
									data: () => ({ name: "Bob", isActive: true }),
								},
								{
									id: "emp-456",
									data: () => ({ name: "Alice", isActive: true }),
								},
							],
						}),
						doc: vi.fn().mockReturnValue({ id: "emp-123" }),
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
						id: "emp-123",
						data: () => ({ name: "Bob", isActive: true }),
					}),
					getAll: vi.fn().mockResolvedValue([
						{
							exists: true,
							id: "emp-123",
							data: () => ({ name: "Bob", isActive: true }),
						},
						{
							exists: true,
							id: "emp-456",
							data: () => ({ name: "Alice", isActive: true }),
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
				.put("/api/employees/emp-123")
				.set("Authorization", authHeader)
				.send({ name: "Alice", editReason: "Typo correction" });

			expect(response.status).toBe(409);
			expect(response.body.error).toContain("already exists");
		});

		it("should allow keeping the same name on update", async () => {
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
				if (path === "employees") {
					return {
						get: vi.fn().mockResolvedValue({
							docs: [
								{
									id: "emp-123",
									data: () => ({ name: "Bob", isActive: true }),
								},
							],
						}),
						doc: vi.fn().mockReturnValue({
							id: "emp-123",
							get: vi.fn().mockResolvedValue({
								id: "emp-123",
								data: () => ({ name: "Bob", position: "Manager" }),
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
						id: "emp-123",
						data: () => ({ name: "Bob", position: "Manager" }),
					}),
					getAll: vi.fn().mockResolvedValue([
						{
							exists: true,
							id: "emp-123",
							data: () => ({ name: "Bob", isActive: true }),
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
				.put("/api/employees/emp-123")
				.set("Authorization", authHeader)
				.send({ name: "Bob", editReason: "No change to name" });

			expect(response.status).toBe(200);
		});

		it("should return 400 when updating employee without editReason (Zod)", async () => {
			const response = await request(app)
				.put("/api/employees/emp-123")
				.set("Authorization", authHeader)
				.send({ base_salary: 4000 }); // missing editReason

			expect(response.status).toBe(400);
			expect(response.body.error).toContain("Required");
		});

		it("should return 400 when updating employee with a too-short editReason (Zod)", async () => {
			const response = await request(app)
				.put("/api/employees/emp-123")
				.set("Authorization", authHeader)
				.send({ base_salary: 4000, editReason: "x" });

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
				if (path === "employees") {
					return {
						get: vi.fn().mockResolvedValue({ docs: [] }),
						doc: vi.fn().mockReturnValue({ id: "missing-emp" }),
						// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
					} as any;
				}
				return {
					doc: vi.fn().mockReturnValue({ id: "missing-emp" }),
					// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				} as any;
			});
			vi.mocked(db.runTransaction).mockImplementationOnce(async (cb) => {
				const mockTx = {
					get: vi.fn().mockResolvedValue({
						exists: false,
						id: "missing-emp",
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

		it("returns 500 when updating a non-existent employee (documented contract)", async () => {
			notFoundTransaction();

			const response = await request(app)
				.put("/api/employees/missing-emp")
				.set("Authorization", authHeader)
				.send({ base_salary: 4000, editReason: "Corrected figures" });

			expect(response.status).toBe(500);
			expect(response.body.error).toContain("Employee not found");
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
				if (path === "employees") {
					return {
						get: vi.fn().mockResolvedValue({ docs: [] }),
						doc: vi.fn().mockReturnValue({ id: "emp-123" }),
						// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
					} as any;
				}
				return {
					doc: vi.fn().mockReturnValue({ id: "emp-123" }),
					// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				} as any;
			});
		};

		it("returns 500 when listing employees crashes", async () => {
			vi.mocked(db.collection).mockImplementation((path: string) => {
				if (path === "employees") {
					return {
						get: vi.fn().mockRejectedValue(new Error("DB crashed")),
						// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
					} as any;
				}
				// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				return { get: vi.fn().mockResolvedValue({ docs: [] }) } as any;
			});

			const response = await request(app)
				.get("/api/employees")
				.set("Authorization", authHeader);

			expect(response.status).toBe(500);
			expect(response.body.error).toBe("Internal server error");
		});

		it("returns 500 when creating employee crashes inside the transaction", async () => {
			chainableCollection();
			vi.mocked(db.runTransaction).mockRejectedValueOnce(
				new Error("DB crashed"),
			);

			const response = await request(app)
				.post("/api/employees")
				.set("Authorization", authHeader)
				.send({
					name: "Bob",
					position: "Manager",
					base_salary: 3000,
					hired_date: "2026-01-01",
				});

			expect(response.status).toBe(500);
			expect(response.body.error).toBe("Internal server error");
		});

		it("returns 500 when updating employee crashes inside the transaction", async () => {
			chainableCollection();
			vi.mocked(db.runTransaction).mockRejectedValueOnce(
				new Error("DB crashed"),
			);

			const response = await request(app)
				.put("/api/employees/emp-123")
				.set("Authorization", authHeader)
				.send({ base_salary: 4000, editReason: "Corrected figures" });

			expect(response.status).toBe(500);
			expect(response.body.error).toBe("Internal server error");
		});
	});

	describe("Unauthorized (missing credentials)", () => {
		it("returns 401 without a bearer token on GET", async () => {
			const response = await request(app).get("/api/employees");

			expect(response.status).toBe(401);
			expect(response.body.error).toContain("No token provided");
		});

		it("returns 401 without a bearer token on POST", async () => {
			const response = await request(app).post("/api/employees").send({
				name: "Bob",
				position: "Manager",
				base_salary: 3000,
				hired_date: "2026-01-01",
			});

			expect(response.status).toBe(401);
		});
	});

	describe("M-102 Employee-User Linkage Uniqueness (ACP-010 Phase 2 / TD-038)", () => {
		it("successfully creates an employee with a valid unlinked user_uid", async () => {
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
				if (path === "employees") {
					return {
						get: vi.fn().mockResolvedValue({ docs: [] }),
						doc: vi.fn().mockReturnValue({ id: "new-emp-linked" }),
						// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
					} as any;
				}
				return {
					doc: vi.fn().mockReturnValue({ id: "audit-m102-create" }),
					// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				} as any;
			});

			vi.mocked(db.runTransaction).mockImplementationOnce(async (cb) => {
				const mockTx = {
					get: vi.fn().mockResolvedValue({ exists: true }),
					getAll: vi.fn().mockResolvedValue([]),
					set: vi.fn(),
					update: vi.fn(),
					delete: vi.fn(),
				};
				// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				return await cb(mockTx as any);
			});

			const response = await request(app)
				.post("/api/employees")
				.set("Authorization", authHeader)
				.send({
					name: "Linked Alice",
					position: "Shift Lead",
					base_salary: 3200,
					hired_date: "2026-01-01",
					user_uid: "user-free-102",
				});

			expect(response.status).toBe(201);
			expect(response.body.user_uid).toBe("user-free-102");
		});

		it("returns 409 when creating an employee with user_uid already linked to an active employee", async () => {
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
				if (path === "employees") {
					return {
						get: vi.fn().mockResolvedValue({
							docs: [
								{
									id: "existing-emp",
									data: () => ({
										name: "Existing Person",
										isActive: true,
										user_uid: "user-already-linked",
									}),
								},
							],
						}),
						doc: vi.fn().mockReturnValue({ id: "new-emp-rejected" }),
						// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
					} as any;
				}
				return {
					doc: vi.fn().mockReturnValue({ id: "audit-m102-dup" }),
					// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				} as any;
			});

			vi.mocked(db.runTransaction).mockImplementationOnce(async (cb) => {
				const mockTx = {
					get: vi.fn().mockResolvedValue({ exists: true }),
					getAll: vi.fn().mockResolvedValue([
						{
							exists: true,
							id: "existing-emp",
							data: () => ({
								name: "Existing Person",
								isActive: true,
								user_uid: "user-already-linked",
							}),
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
				.post("/api/employees")
				.set("Authorization", authHeader)
				.send({
					name: "New Person",
					position: "Staff",
					base_salary: 2500,
					hired_date: "2026-01-01",
					user_uid: "user-already-linked",
				});

			expect(response.status).toBe(409);
			expect(response.body.error).toContain("already linked");
		});

		it("permits creating an employee with user_uid if previously linked employee is inactive", async () => {
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
				if (path === "employees") {
					return {
						get: vi.fn().mockResolvedValue({
							docs: [
								{
									id: "inactive-emp",
									data: () => ({
										name: "Former Staff",
										isActive: false,
										user_uid: "user-reused",
									}),
								},
							],
						}),
						doc: vi.fn().mockReturnValue({ id: "new-emp-active" }),
						// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
					} as any;
				}
				return {
					doc: vi.fn().mockReturnValue({ id: "audit-m102-inactive" }),
					// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				} as any;
			});

			vi.mocked(db.runTransaction).mockImplementationOnce(async (cb) => {
				const mockTx = {
					get: vi.fn().mockResolvedValue({ exists: true }),
					getAll: vi.fn().mockResolvedValue([
						{
							exists: true,
							id: "inactive-emp",
							data: () => ({
								name: "Former Staff",
								isActive: false,
								user_uid: "user-reused",
							}),
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
				.post("/api/employees")
				.set("Authorization", authHeader)
				.send({
					name: "Current Staff",
					position: "Staff",
					base_salary: 2600,
					hired_date: "2026-01-01",
					user_uid: "user-reused",
				});

			expect(response.status).toBe(201);
			expect(response.body.user_uid).toBe("user-reused");
		});

		it("returns 409 when updating an employee to a user_uid already linked to another active employee", async () => {
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
				if (path === "employees") {
					return {
						get: vi.fn().mockResolvedValue({
							docs: [
								{
									id: "my-emp",
									data: () => ({
										name: "My Employee",
										isActive: true,
										user_uid: null,
									}),
								},
								{
									id: "other-emp",
									data: () => ({
										name: "Other Employee",
										isActive: true,
										user_uid: "user-taken",
									}),
								},
							],
						}),
						doc: vi.fn().mockReturnValue({
							id: "my-emp",
							get: vi.fn().mockResolvedValue({
								exists: true,
								data: () => ({
									name: "My Employee",
									isActive: true,
									user_uid: null,
								}),
							}),
						}),
						// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
					} as any;
				}
				return {
					doc: vi.fn().mockReturnValue({ id: "audit-m102-update-dup" }),
					// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				} as any;
			});

			vi.mocked(db.runTransaction).mockImplementationOnce(async (cb) => {
				const mockTx = {
					get: vi.fn().mockResolvedValue({
						exists: true,
						id: "my-emp",
						data: () => ({
							name: "My Employee",
							isActive: true,
							user_uid: null,
						}),
					}),
					getAll: vi.fn().mockResolvedValue([
						{
							exists: true,
							id: "my-emp",
							data: () => ({
								name: "My Employee",
								isActive: true,
								user_uid: null,
							}),
						},
						{
							exists: true,
							id: "other-emp",
							data: () => ({
								name: "Other Employee",
								isActive: true,
								user_uid: "user-taken",
							}),
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
				.put("/api/employees/my-emp")
				.set("Authorization", authHeader)
				.send({
					user_uid: "user-taken",
					editReason: "Attempt duplicate user link",
				});

			expect(response.status).toBe(409);
			expect(response.body.error).toContain("already linked");
		});

		it("permits updating an employee while keeping the same user_uid", async () => {
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
				if (path === "employees") {
					return {
						get: vi.fn().mockResolvedValue({
							docs: [
								{
									id: "my-emp",
									data: () => ({
										name: "My Employee",
										isActive: true,
										user_uid: "user-own",
									}),
								},
							],
						}),
						doc: vi.fn().mockReturnValue({
							id: "my-emp",
							get: vi.fn().mockResolvedValue({
								exists: true,
								data: () => ({
									name: "My Employee",
									isActive: true,
									user_uid: "user-own",
								}),
							}),
						}),
						// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
					} as any;
				}
				return {
					doc: vi.fn().mockReturnValue({ id: "audit-m102-update-same" }),
					// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				} as any;
			});

			vi.mocked(db.runTransaction).mockImplementationOnce(async (cb) => {
				const mockTx = {
					get: vi.fn().mockResolvedValue({
						exists: true,
						id: "my-emp",
						data: () => ({
							name: "My Employee",
							isActive: true,
							user_uid: "user-own",
						}),
					}),
					getAll: vi.fn().mockResolvedValue([
						{
							exists: true,
							id: "my-emp",
							data: () => ({
								name: "My Employee",
								isActive: true,
								user_uid: "user-own",
							}),
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
				.put("/api/employees/my-emp")
				.set("Authorization", authHeader)
				.send({
					user_uid: "user-own",
					editReason: "Update position without changing user link",
				});

			expect(response.status).toBe(200);
		});

		it("successfully unlinks an employee when user_uid is set to null", async () => {
			const mockUpdate = vi.fn();

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
				if (path === "employees") {
					return {
						get: vi.fn().mockResolvedValue({
							docs: [
								{
									id: "my-emp",
									data: () => ({
										name: "My Employee",
										isActive: true,
										user_uid: "user-old",
									}),
								},
							],
						}),
						doc: vi.fn().mockReturnValue({
							id: "my-emp",
							get: vi.fn().mockResolvedValue({
								exists: true,
								data: () => ({
									name: "My Employee",
									isActive: true,
									user_uid: null,
								}),
							}),
						}),
						// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
					} as any;
				}
				return {
					doc: vi.fn().mockReturnValue({ id: "audit-m102-unlink" }),
					// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				} as any;
			});

			vi.mocked(db.runTransaction).mockImplementationOnce(async (cb) => {
				const mockTx = {
					get: vi.fn().mockResolvedValue({
						exists: true,
						id: "my-emp",
						data: () => ({
							name: "My Employee",
							isActive: true,
							user_uid: "user-old",
						}),
					}),
					getAll: vi.fn().mockResolvedValue([]),
					set: vi.fn(),
					update: mockUpdate,
					delete: vi.fn(),
				};
				// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				return await cb(mockTx as any);
			});

			const response = await request(app)
				.put("/api/employees/my-emp")
				.set("Authorization", authHeader)
				.send({
					user_uid: null,
					editReason: "Unlinked system account",
				});

			expect(response.status).toBe(200);
			expect(mockUpdate).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({ user_uid: null }),
			);
		});
	});
});
