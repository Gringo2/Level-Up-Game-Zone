import request from "supertest";
import { describe, expect, it, vi, beforeEach } from "vitest";
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
					} as any;
				}
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
				return {
					doc: vi.fn().mockReturnValue({ id: "new-emp-123" }),
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
				return {
					doc: vi.fn().mockReturnValue({ id: "emp-123" }),
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

		it("should return 400 when updating employee without editReason (Zod)", async () => {
			const response = await request(app)
				.put("/api/employees/emp-123")
				.set("Authorization", authHeader)
				.send({ base_salary: 4000 }); // missing editReason

			expect(response.status).toBe(400);
			expect(response.body.error).toContain("Required");
		});
	});
});
