import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import "./setupTests.js";
import app from "../app.js";

const { db } = await import("../firebase.js");

describe("Expense Categories Integration Tests", () => {
	const authHeader = "Bearer valid-mock-token";

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("Golden Path (Success Scenarios)", () => {
		it("should successfully list expense categories", async () => {
			vi.mocked(db.collection).mockImplementation((path: string) => {
				if (path === "expense_categories") {
					return {
						get: vi.fn().mockResolvedValue({
							docs: [
								{
									id: "cat1",
									data: () => ({
										name: "Supplies",
										isActive: true,
										created_at: "2026-08-17T00:00:00.000Z",
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
				.get("/api/expense-categories")
				.set("Authorization", authHeader);

			expect(response.status).toBe(200);
			expect(response.body).toHaveLength(1);
			expect(response.body[0].name).toBe("Supplies");
		});

		it("should successfully create an expense category", async () => {
			vi.mocked(db.collection).mockImplementation((_path: string) => {
				return {
					doc: vi.fn().mockReturnValue({ id: "new-cat-123" }),
					where: vi.fn().mockReturnThis(),
					get: vi.fn().mockResolvedValue({ empty: true, docs: [] }),
					// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				} as any;
			});

			const response = await request(app)
				.post("/api/expense-categories")
				.set("Authorization", authHeader)
				.send({ name: "Transport" });

			expect(response.status).toBe(201);
			expect(response.body.name).toBe("Transport");
			expect(response.body.isActive).toBe(true);
		});

		it("should successfully update an expense category", async () => {
			vi.mocked(db.collection).mockImplementation((_path: string) => {
				return {
					doc: vi.fn().mockReturnValue({ id: "cat-123" }),
					// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				} as any;
			});

			vi.mocked(db.runTransaction).mockImplementationOnce(async (cb) => {
				const mockTx = {
					get: vi.fn().mockResolvedValue({
						exists: true,
						id: "cat-123",
						data: () => ({ name: "Old Name", isActive: true }),
					}),
					set: vi.fn(),
					update: vi.fn(),
					delete: vi.fn(),
				};
				// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				return await cb(mockTx as any);
			});

			const response = await request(app)
				.put("/api/expense-categories/cat-123")
				.set("Authorization", authHeader)
				.send({ name: "New Name", editReason: "Renaming category" });

			expect(response.status).toBe(200);
			expect(response.body.id).toBe("cat-123");
			expect(response.body.name).toBe("New Name");
		});

		it("should successfully delete an expense category", async () => {
			vi.mocked(db.collection).mockImplementation((_path: string) => {
				return {
					doc: vi.fn().mockReturnValue({ id: "cat-123" }),
					// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				} as any;
			});

			vi.mocked(db.runTransaction).mockImplementationOnce(async (cb) => {
				const mockTx = {
					get: vi.fn().mockResolvedValue({
						exists: true,
						id: "cat-123",
						data: () => ({ name: "To Delete", isActive: true }),
					}),
					set: vi.fn(),
					update: vi.fn(),
					delete: vi.fn(),
				};
				// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				return await cb(mockTx as any);
			});

			const response = await request(app)
				.delete("/api/expense-categories/cat-123")
				.set("Authorization", authHeader);

			expect(response.status).toBe(200);
			expect(response.body.message).toBe("Deleted successfully");
		});

		it("should deactivate an expense category", async () => {
			vi.mocked(db.collection).mockImplementation((_path: string) => {
				return {
					doc: vi.fn().mockReturnValue({ id: "cat-123" }),
					// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				} as any;
			});

			vi.mocked(db.runTransaction).mockImplementationOnce(async (cb) => {
				const mockTx = {
					get: vi.fn().mockResolvedValue({
						exists: true,
						id: "cat-123",
						data: () => ({ name: "Supplies", isActive: true }),
					}),
					set: vi.fn(),
					update: vi.fn(),
					delete: vi.fn(),
				};
				// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				return await cb(mockTx as any);
			});

			const response = await request(app)
				.put("/api/expense-categories/cat-123")
				.set("Authorization", authHeader)
				.send({ isActive: false, editReason: "Deactivating category" });

			expect(response.status).toBe(200);
			expect(response.body.id).toBe("cat-123");
			expect(response.body.isActive).toBe(false);
		});
	});

	describe("Negative Path (Rejection Scenarios)", () => {
		it("should return 400 when creating a category with empty name", async () => {
			const response = await request(app)
				.post("/api/expense-categories")
				.set("Authorization", authHeader)
				.send({ name: "" });

			expect(response.status).toBe(400);
		});

		it("should return 409 when creating a category with a duplicate name", async () => {
			vi.mocked(db.collection).mockImplementation((path: string) => {
				if (path === "expense_categories") {
					return {
						where: vi.fn().mockReturnThis(),
						get: vi.fn().mockResolvedValue({
							empty: false,
							docs: [
								{ id: "existing-cat", data: () => ({ name: "Supplies" }) },
							],
						}),
						// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
					} as any;
				}
				// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				return { doc: vi.fn().mockReturnValue({ id: "irrelevant" }) } as any;
			});

			const response = await request(app)
				.post("/api/expense-categories")
				.set("Authorization", authHeader)
				.send({ name: "Supplies" });

			expect(response.status).toBe(409);
			expect(response.body.error).toBe(
				"A category with this name already exists",
			);
		});

		it("should return 400 when updating without editReason", async () => {
			vi.mocked(db.collection).mockImplementation((_path: string) => {
				return {
					doc: vi.fn().mockReturnValue({ id: "cat-123" }),
					// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				} as any;
			});

			const response = await request(app)
				.put("/api/expense-categories/cat-123")
				.set("Authorization", authHeader)
				.send({ name: "New Name" });

			expect(response.status).toBe(400);
		});

		it("should return 401 without auth token", async () => {
			const response = await request(app).get("/api/expense-categories");
			expect(response.status).toBe(401);
		});

		it("should return 404 when updating a non-existent category", async () => {
			vi.mocked(db.collection).mockImplementation((_path: string) => {
				return {
					doc: vi.fn().mockReturnValue({ id: "nonexistent" }),
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
				.put("/api/expense-categories/nonexistent")
				.set("Authorization", authHeader)
				.send({ name: "New Name", editReason: "Test" });

			expect(response.status).toBe(404);
			expect(response.body.error).toBe("Expense category not found");
		});
	});

	describe("Database Crash (500 fallback)", () => {
		it("returns 500 when listing categories crashes", async () => {
			vi.mocked(db.collection).mockImplementation(() => {
				throw new Error("DB read failed");
			});

			const response = await request(app)
				.get("/api/expense-categories")
				.set("Authorization", authHeader);

			expect(response.status).toBe(500);
			expect(response.body.error).toBe("Internal server error");
		});

		it("returns 500 when creating category crashes on DB read", async () => {
			vi.mocked(db.collection).mockImplementation(() => {
				throw new Error("DB write failed");
			});

			const response = await request(app)
				.post("/api/expense-categories")
				.set("Authorization", authHeader)
				.send({ name: "Test" });

			expect(response.status).toBe(500);
			expect(response.body.error).toBe("Internal server error");
		});

		it("returns 404 when deleting a non-existent category", async () => {
			vi.mocked(db.collection).mockImplementation((_path: string) => {
				return {
					doc: vi.fn().mockReturnValue({ id: "nonexistent" }),
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
				.delete("/api/expense-categories/nonexistent")
				.set("Authorization", authHeader);

			expect(response.status).toBe(404);
			expect(response.body.error).toBe("Expense category not found");
		});
	});
});
