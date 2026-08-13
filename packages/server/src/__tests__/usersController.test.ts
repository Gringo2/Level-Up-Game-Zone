import request from "supertest";
import { describe, expect, it, vi, beforeEach } from "vitest";
import "./setupTests.js";
import app from "../app.js";

const { db } = await import("../firebase.js");

describe("Users Integration Tests", () => {
	const authHeader = "Bearer valid-mock-token";

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("Golden Path (Success Scenarios)", () => {
		it("should allow an admin to successfully invite a new user", async () => {
			vi.mocked(db.collection).mockImplementation((path: string) => {
				if (path === "users") {
					return {
						doc: () => ({
							get: vi.fn().mockResolvedValue({
								exists: true,
								data: () => ({ role: "admin" }),
							}),
						}),
						where: () => ({
							get: vi.fn().mockResolvedValue({ empty: true }),
						}),
					} as any;
				}
				if (path === "user_invites") {
					return {
						doc: () => ({
							get: vi.fn().mockResolvedValue({ exists: false }),
							set: vi.fn(),
						}),
					} as any;
				}
				return { doc: vi.fn().mockReturnThis(), set: vi.fn() } as any;
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
				.post("/api/users/invite")
				.set("Authorization", authHeader)
				.send({ email: "newstaff@example.com", role: "staff" });

			expect(response.status).toBe(201);
		});

		it("should allow a user to successfully create their account via invite", async () => {
			vi.mocked(db.collection).mockImplementation((path: string) => {
				if (path === "user_invites") {
					return {
						doc: () => ({
							get: vi.fn().mockResolvedValue({
								exists: true,
								data: () => ({ role: "staff" }),
							}),
							delete: vi.fn(),
						}),
					} as any;
				}
				if (path === "users") {
					return {
						doc: () => ({
							get: vi.fn().mockResolvedValue({ exists: false }),
							set: vi.fn(),
						}),
					} as any;
				}
				return { doc: vi.fn().mockReturnThis() } as any;
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
				.post("/api/users")
				.set("Authorization", authHeader) 
				.send({});

			expect(response.status).toBe(201);
		});
	});

	describe("Negative Path (Rejection Scenarios)", () => {
		it("should return 401 if user is missing from request", async () => {
			const response = await request(app).get("/api/users/me");
			expect(response.status).toBe(401);
		});

		it("updateRole should return 400 if editReason is missing or too short (Zod Validation)", async () => {
			const response = await request(app)
				.put("/api/users/user123/role")
				.set("Authorization", authHeader)
				.send({ role: "manager", editReason: "hi" }); 
			expect(response.status).toBe(400);
		});

		it("updateRole should return 400 if role is invalid (Zod Validation)", async () => {
			const response = await request(app)
				.put("/api/users/user123/role")
				.set("Authorization", authHeader)
				.send({ role: "super_admin", editReason: "valid reason" }); 
			expect(response.status).toBe(400);
		});

		it("updateRole should return 403 if requester is not an admin", async () => {
			vi.mocked(db.collection).mockImplementation((path: string) => {
				if (path === "users") {
					return {
						doc: () => ({
							get: vi.fn().mockResolvedValue({
								exists: true,
								data: () => ({ role: "staff" }), 
							}),
						}),
					} as any;
				}
				return { doc: vi.fn().mockReturnThis() } as any;
			});

			const response = await request(app)
				.put("/api/users/user123/role")
				.set("Authorization", authHeader)
				.send({ role: "manager", editReason: "valid reason" });

			expect(response.status).toBe(403);
		});
	});
});
