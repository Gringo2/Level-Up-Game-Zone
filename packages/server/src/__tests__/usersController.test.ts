import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import "./setupTests.js";
import app from "../app.js";
import { InviteUserSchema } from "../schemas/index.js";

const { db, auth } = await import("../firebase.js");

const rootAdminToken = { uid: "root-admin-uid", email: "bezueyob3@gmail.com" };
const regularToken = { uid: "staff-uid", email: "staff@example.com" };

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

						// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
					} as any;
				}
				if (path === "user_invites") {
					return {
						doc: () => ({
							get: vi.fn().mockResolvedValue({ exists: false }),
							set: vi.fn(),
						}),

						// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
					} as any;
				}

				// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
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

						// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
					} as any;
				}
				if (path === "users") {
					return {
						doc: () => ({
							get: vi.fn().mockResolvedValue({ exists: false }),
							set: vi.fn(),
						}),

						// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
					} as any;
				}

				// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
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

		it("should register a root admin account without an invite", async () => {
			vi.mocked(auth.verifyIdToken).mockResolvedValueOnce(
				// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				rootAdminToken as any,
			);

			vi.mocked(db.collection).mockImplementation((path: string) => {
				if (path === "users") {
					return {
						doc: () => ({
							get: vi.fn().mockResolvedValue({ exists: false }),
							set: vi.fn(),
						}),

						// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
					} as any;
				}

				// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
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
			expect(response.body.role).toBe("admin");
		});

		it("should return the current user profile from /users/me", async () => {
			vi.mocked(db.collection).mockImplementation((path: string) => {
				if (path === "users") {
					return {
						doc: () => ({
							get: vi.fn().mockResolvedValue({
								exists: true,
								id: "mock-admin-uid",
								data: () => ({
									email: "admin@example.com",
									role: "admin",
									displayName: "Admin",
								}),
							}),
						}),

						// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
					} as any;
				}

				// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				return { doc: vi.fn().mockReturnThis() } as any;
			});

			const response = await request(app)
				.get("/api/users/me")
				.set("Authorization", authHeader);

			expect(response.status).toBe(200);
			expect(response.body.uid).toBe("mock-admin-uid");
			expect(response.body.role).toBe("admin");
		});

		it("should list all users", async () => {
			vi.mocked(db.collection).mockImplementation((path: string) => {
				if (path === "users") {
					return {
						doc: () => ({
							get: vi.fn().mockResolvedValue({
								exists: true,
								data: () => ({ role: "admin" }),
							}),
						}),
						get: vi.fn().mockResolvedValue({
							docs: [
								{ id: "u1", data: () => ({ email: "a@x.com", role: "admin" }) },
								{ id: "u2", data: () => ({ email: "b@x.com", role: "staff" }) },
							],
						}),

						// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
					} as any;
				}

				// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				return { get: vi.fn().mockResolvedValue({ docs: [] }) } as any;
			});

			const response = await request(app)
				.get("/api/users")
				.set("Authorization", authHeader);

			expect(response.status).toBe(200);
			expect(response.body).toHaveLength(2);
			expect(response.body[0].id).toBe("u1");
		});

		it("should allow an admin to update a user role", async () => {
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

				// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				return { doc: vi.fn().mockReturnThis() } as any;
			});

			vi.mocked(db.runTransaction).mockImplementationOnce(async (cb) => {
				const mockTx = {
					get: vi.fn().mockResolvedValue({
						exists: true,
						id: "user123",
						data: () => ({ email: "target@x.com", role: "staff" }),
					}),
					set: vi.fn(),
					update: vi.fn(),
					delete: vi.fn(),
				};
				// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				return await cb(mockTx as any);
			});

			const response = await request(app)
				.put("/api/users/user123/role")
				.set("Authorization", authHeader)
				.send({ role: "manager", editReason: "Promoting to manager" });

			expect(response.status).toBe(200);
			expect(response.body.message).toBe("Role updated successfully");
		});

		it("should allow an admin to delete a user account", async () => {
			vi.mocked(db.collection).mockImplementation((path: string) => {
				if (path === "users") {
					return {
						doc: () => ({
							id: "userToDelete",
							get: vi.fn().mockResolvedValue({
								exists: true,
								data: () => ({ role: "admin" }),
							}),
						}),

						// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
					} as any;
				}

				// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				return { doc: vi.fn().mockReturnThis() } as any;
			});

			vi.mocked(db.runTransaction).mockImplementationOnce(async (cb) => {
				const mockTx = {
					get: vi.fn().mockImplementation((ref) => {
						if (ref?.id === "userToDelete") {
							return Promise.resolve({
								exists: true,
								id: "userToDelete",
								data: () => ({ email: "staff@x.com", role: "staff" }),
							});
						}
						return Promise.resolve({ exists: false });
					}),
					set: vi.fn(),
					update: vi.fn(),
					delete: vi.fn(),
				};
				// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				return await cb(mockTx as any);
			});

			const response = await request(app)
				.delete("/api/users/userToDelete")
				.set("Authorization", authHeader)
				.send({ deleteReason: "Removing inactive user" });

			expect(response.status).toBe(200);
			expect(response.body.message).toBe(
				"User account or invitation removed successfully",
			);
		});

		it("should allow an admin to revoke an invitation", async () => {
			vi.mocked(db.collection).mockImplementation((path: string) => {
				if (path === "users") {
					return {
						doc: () => ({
							id: "invited@x.com",
							get: vi.fn().mockResolvedValue({
								exists: true,
								data: () => ({ role: "admin" }),
							}),
						}),

						// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
					} as any;
				}

				// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				return { doc: vi.fn().mockReturnThis() } as any;
			});

			vi.mocked(db.runTransaction).mockImplementationOnce(async (cb) => {
				const mockTx = {
					get: vi.fn().mockImplementation((ref) => {
						if (ref?.id === "invited@x.com") {
							return Promise.resolve({
								exists: true,
								id: "invited@x.com",
								data: () => ({ email: "invited@x.com", role: "staff" }),
							});
						}
						return Promise.resolve({ exists: false });
					}),
					set: vi.fn(),
					update: vi.fn(),
					delete: vi.fn(),
				};
				// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				return await cb(mockTx as any);
			});

			const response = await request(app)
				.delete("/api/users/invited@x.com")
				.set("Authorization", authHeader)
				.send({ deleteReason: "Revoking invitation" });

			expect(response.status).toBe(200);
			expect(response.body.message).toBe(
				"User account or invitation removed successfully",
			);
		});

		it("should revoke an invitation when the user document does not exist yet", async () => {
			vi.mocked(db.collection).mockImplementation((path: string) => {
				if (path === "users") {
					return {
						doc: () => ({
							id: "pending@x.com",
							get: vi.fn().mockResolvedValue({
								exists: true,
								data: () => ({ role: "admin" }),
							}),
						}),

						// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
					} as any;
				}

				// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				return { doc: vi.fn().mockReturnThis() } as any;
			});

			vi.mocked(db.runTransaction).mockImplementationOnce(async (cb) => {
				const mockTx = {
					get: vi.fn().mockImplementation((ref) => {
						if (ref?.id === "pending@x.com") {
							return Promise.resolve({ exists: false });
						}
						return Promise.resolve({
							exists: true,
							id: "pending@x.com",
							data: () => ({ role: "staff" }),
						});
					}),
					set: vi.fn(),
					update: vi.fn(),
					delete: vi.fn(),
				};
				// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				return await cb(mockTx as any);
			});

			const response = await request(app)
				.delete("/api/users/pending@x.com")
				.set("Authorization", authHeader)
				.send({ deleteReason: "Revoking pending invite" });

			expect(response.status).toBe(200);
			expect(response.body.message).toBe(
				"User account or invitation removed successfully",
			);
		});
	});

	describe("Negative Path (Rejection Scenarios)", () => {
		it("should return 401 if user is missing from request", async () => {
			const response = await request(app).get("/api/users/me");
			expect(response.status).toBe(401);
		});

		it("should return 404 for /users/me when the profile does not exist", async () => {
			vi.mocked(db.collection).mockImplementation((path: string) => {
				if (path === "users") {
					return {
						doc: () => ({
							get: vi.fn().mockResolvedValue({ exists: false }),
						}),

						// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
					} as any;
				}

				// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				return { doc: vi.fn().mockReturnThis() } as any;
			});

			const response = await request(app)
				.get("/api/users/me")
				.set("Authorization", authHeader);

			expect(response.status).toBe(404);
			expect(response.body.error).toBe("User profile not found");
		});

		it("updateRole should return 400 if editReason is missing or too short (Zod Validation)", async () => {
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
				// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				return { doc: vi.fn().mockReturnThis() } as any;
			});

			const response = await request(app)
				.put("/api/users/user123/role")
				.set("Authorization", authHeader)
				.send({ role: "manager", editReason: "hi" });
			expect(response.status).toBe(400);
		});

		it("updateRole should return 400 if role is invalid (Zod Validation)", async () => {
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
				// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				return { doc: vi.fn().mockReturnThis() } as any;
			});

			const response = await request(app)
				.put("/api/users/user123/role")
				.set("Authorization", authHeader)
				.send({ role: "super_admin", editReason: "valid reason" });
			expect(response.status).toBe(400);
		});

		it("inviteUser should return 400 if role is invalid (InviteUserSchema errorMap)", async () => {
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
				// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				return { doc: vi.fn().mockReturnThis() } as any;
			});

			const response = await request(app)
				.post("/api/users/invite")
				.set("Authorization", authHeader)
				.send({ email: "new@example.com", role: "super_admin" });
			expect(response.status).toBe(400);
			expect(response.body.error).toContain(
				"Role must be 'admin', 'manager', or 'staff'",
			);
		});

		it("invite schema enforces role enum errorMap (create schema no longer carries role)", async () => {
			const parsed = InviteUserSchema.safeParse({
				email: "a@b.com",
				role: "superadmin",
			});
			expect(parsed.success).toBe(false);
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

						// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
					} as any;
				}

				// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				return { doc: vi.fn().mockReturnThis() } as any;
			});

			const response = await request(app)
				.put("/api/users/user123/role")
				.set("Authorization", authHeader)
				.send({ role: "manager", editReason: "valid reason" });

			expect(response.status).toBe(403);
		});

		it("updateRole should return 500 when the target user does not exist (documented contract)", async () => {
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

				// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
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
				.put("/api/users/missing-user/role")
				.set("Authorization", authHeader)
				.send({ role: "manager", editReason: "valid reason" });

			expect(response.status).toBe(500);
			expect(response.body.error).toContain("User not found");
		});

		it("inviteUser should return 400 if the user is already registered", async () => {
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
							get: vi.fn().mockResolvedValue({
								empty: false,
								docs: [{ id: "existing" }],
							}),
						}),

						// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
					} as any;
				}

				// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				return { doc: vi.fn().mockReturnThis() } as any;
			});

			const response = await request(app)
				.post("/api/users/invite")
				.set("Authorization", authHeader)
				.send({ email: "existing@x.com", role: "staff" });

			expect(response.status).toBe(400);
			expect(response.body.error).toBe("User is already registered");
		});

		it("inviteUser should return 400 if the invite already exists", async () => {
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

						// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
					} as any;
				}
				if (path === "user_invites") {
					return {
						doc: () => ({
							get: vi.fn().mockResolvedValue({ exists: false }),
						}),

						// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
					} as any;
				}

				// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				return { doc: vi.fn().mockReturnThis() } as any;
			});

			vi.mocked(db.runTransaction).mockImplementationOnce(async (cb) => {
				const mockTx = {
					get: vi.fn().mockResolvedValue({ exists: true }),
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
				.send({ email: "dupe@x.com", role: "staff" });

			expect(response.status).toBe(400);
			expect(response.body.error).toBe("User already invited");
		});

		it("inviteUser should return 403 if requester is not an admin", async () => {
			vi.mocked(db.collection).mockImplementation((path: string) => {
				if (path === "users") {
					return {
						doc: () => ({
							get: vi.fn().mockResolvedValue({
								exists: true,
								data: () => ({ role: "staff" }),
							}),
						}),

						// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
					} as any;
				}

				// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				return { doc: vi.fn().mockReturnThis() } as any;
			});

			const response = await request(app)
				.post("/api/users/invite")
				.set("Authorization", authHeader)
				.send({ email: "new@x.com", role: "staff" });

			expect(response.status).toBe(403);
			expect(response.body.error).toBe(
				"Forbidden: Insufficient role permissions",
			);
		});

		it("TD-025: body role must be ignored — assigned role comes from the invite", async () => {
			vi.mocked(db.collection).mockImplementation((path: string) => {
				if (path === "users") {
					return {
						doc: () => ({
							get: vi.fn().mockResolvedValue({ exists: false }),
						}),

						// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
					} as any;
				}
				if (path === "user_invites") {
					return {
						doc: () => ({
							get: vi.fn().mockResolvedValue({
								exists: true,
								data: () => ({ role: "staff" }),
							}),
						}),
						// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
					} as any;
				}

				// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
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
				.send({ email: "esc@x.com", role: "admin" });

			expect(response.status).toBe(201);
			expect(response.body.role).toBe("staff");
		});

		it("TD-025: re-registration by an existing user returns clean 400", async () => {
			vi.mocked(db.collection).mockImplementation((path: string) => {
				if (path === "users") {
					return {
						doc: () => ({
							get: vi.fn().mockResolvedValue({
								exists: true,
								data: () => ({ role: "staff" }),
							}),
						}),

						// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
					} as any;
				}
				if (path === "user_invites") {
					return {
						doc: () => ({
							get: vi.fn().mockResolvedValue({
								exists: true,
								data: () => ({ role: "staff" }),
							}),
						}),
						// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
					} as any;
				}

				// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				return { doc: vi.fn().mockReturnThis() } as any;
			});

			const response = await request(app)
				.post("/api/users")
				.set("Authorization", authHeader)
				.send({ email: "esc@x.com" });

			expect(response.status).toBe(400);
			expect(response.body.error).toBe("User already exists");
		});

		it("createUser should return 403 for a non-root user without an invite", async () => {
			// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
			vi.mocked(auth.verifyIdToken).mockResolvedValueOnce(regularToken as any);

			vi.mocked(db.collection).mockImplementation((path: string) => {
				if (path === "user_invites") {
					return {
						doc: () => ({
							get: vi.fn().mockResolvedValue({ exists: false }),
						}),

						// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
					} as any;
				}

				// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				return { doc: vi.fn().mockReturnThis() } as any;
			});

			const response = await request(app)
				.post("/api/users")
				.set("Authorization", authHeader)
				.send({});

			expect(response.status).toBe(403);
			expect(response.body.error).toContain(
				"not authorized to access this system",
			);
		});

		it("createUser should return 400 if the auth token carries no email", async () => {
			vi.mocked(auth.verifyIdToken).mockResolvedValueOnce({
				uid: "no-email-uid",
				// biome-ignore lint/suspicious/noExplicitAny: Mock token omits email to exercise guard
			} as any);

			const response = await request(app)
				.post("/api/users")
				.set("Authorization", authHeader)
				.send({});

			expect(response.status).toBe(400);
			expect(response.body.error).toBe("Email required from auth token");
		});

		it("createUser should return 400 if the user already exists", async () => {
			vi.mocked(db.collection).mockImplementation((path: string) => {
				if (path === "user_invites") {
					return {
						doc: () => ({
							get: vi.fn().mockResolvedValue({
								exists: true,
								data: () => ({ role: "staff" }),
							}),
						}),

						// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
					} as any;
				}
				if (path === "users") {
					return {
						doc: () => ({
							get: vi.fn().mockResolvedValue({ exists: true }),
							set: vi.fn(),
						}),

						// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
					} as any;
				}

				// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				return { doc: vi.fn().mockReturnThis() } as any;
			});

			vi.mocked(db.runTransaction).mockImplementationOnce(async (cb) => {
				const mockTx = {
					get: vi.fn().mockResolvedValue({ exists: true }),
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

			expect(response.status).toBe(400);
			expect(response.body.error).toBe("User already exists");
		});

		it("deleteUser should return 400 when deleting your own account", async () => {
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
				// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				return { doc: vi.fn().mockReturnThis() } as any;
			});

			const response = await request(app)
				.delete("/api/users/mock-admin-uid")
				.set("Authorization", authHeader)
				.send({ deleteReason: "Trying to delete self" });

			expect(response.status).toBe(400);
			expect(response.body.error).toBe("Cannot delete your own user account");
		});

		it("deleteUser should return 403 if requester is not an admin", async () => {
			vi.mocked(db.collection).mockImplementation((path: string) => {
				if (path === "users") {
					return {
						doc: () => ({
							get: vi.fn().mockResolvedValue({
								exists: true,
								data: () => ({ role: "staff" }),
							}),
						}),

						// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
					} as any;
				}

				// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				return { doc: vi.fn().mockReturnThis() } as any;
			});

			const response = await request(app)
				.delete("/api/users/other-user")
				.set("Authorization", authHeader)
				.send({ deleteReason: "Trying to delete other" });

			expect(response.status).toBe(403);
			expect(response.body.error).toBe(
				"Forbidden: Insufficient role permissions",
			);
		});

		it("deleteUser should return 404 when the user or invitation does not exist", async () => {
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

				// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
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
				.delete("/api/users/ghost-user")
				.set("Authorization", authHeader)
				.send({ deleteReason: "Cleaning up ghost user" });

			expect(response.status).toBe(404);
			expect(response.body.error).toBe("User or invitation not found");
		});

		it("deleteUser should return 403 when targeting a root admin account", async () => {
			vi.mocked(db.collection).mockImplementation((path: string) => {
				if (path === "users") {
					return {
						doc: () => ({
							id: "bezueyob3-gmail",
							get: vi.fn().mockResolvedValue({
								exists: true,
								data: () => ({ role: "admin" }),
							}),
						}),

						// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
					} as any;
				}

				// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				return { doc: vi.fn().mockReturnThis() } as any;
			});

			vi.mocked(db.runTransaction).mockImplementationOnce(async (cb) => {
				const mockTx = {
					get: vi.fn().mockImplementation((ref) => {
						if (ref?.id === "bezueyob3-gmail") {
							return Promise.resolve({
								exists: true,
								id: "bezueyob3-gmail",
								data: () => ({ email: "bezueyob3@gmail.com" }),
							});
						}
						return Promise.resolve({ exists: false });
					}),
					set: vi.fn(),
					update: vi.fn(),
					delete: vi.fn(),
				};
				// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				return await cb(mockTx as any);
			});

			const response = await request(app)
				.delete("/api/users/bezueyob3-gmail")
				.set("Authorization", authHeader)
				.send({ deleteReason: "Trying to delete root admin" });

			expect(response.status).toBe(403);
			expect(response.body.error).toBe("Root admin accounts cannot be deleted");
		});
	});

	describe("Database Crash (500 fallback)", () => {
		it("returns 500 when listing users crashes", async () => {
			vi.mocked(db.collection).mockImplementation((path: string) => {
				if (path === "users") {
					return {
						doc: () => ({
							get: vi.fn().mockResolvedValue({
								exists: true,
								data: () => ({ role: "admin" }),
							}),
						}),
						get: vi.fn().mockRejectedValue(new Error("DB crashed")),

						// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
					} as any;
				}

				// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				return { get: vi.fn().mockResolvedValue({ docs: [] }) } as any;
			});

			const response = await request(app)
				.get("/api/users")
				.set("Authorization", authHeader);

			expect(response.status).toBe(500);
			expect(response.body.error).toBe("Internal server error");
		});

		it("returns 500 when fetching profile crashes", async () => {
			vi.mocked(db.collection).mockImplementation((path: string) => {
				if (path === "users") {
					return {
						doc: () => ({
							get: vi.fn().mockRejectedValue(new Error("DB crashed")),
						}),

						// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
					} as any;
				}

				// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				return { doc: vi.fn().mockReturnThis() } as any;
			});

			const response = await request(app)
				.get("/api/users/me")
				.set("Authorization", authHeader);

			expect(response.status).toBe(500);
			expect(response.body.error).toBe("Internal server error");
		});

		it("returns 500 when createUser crashes inside the transaction", async () => {
			vi.mocked(auth.verifyIdToken).mockResolvedValueOnce(
				// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				rootAdminToken as any,
			);

			vi.mocked(db.collection).mockImplementation((path: string) => {
				if (path === "users") {
					return {
						doc: () => ({
							get: vi.fn().mockResolvedValue({ exists: false }),
						}),

						// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
					} as any;
				}

				// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				return { doc: vi.fn().mockReturnThis() } as any;
			});

			vi.mocked(db.runTransaction).mockRejectedValueOnce(
				new Error("DB crashed"),
			);

			const response = await request(app)
				.post("/api/users")
				.set("Authorization", authHeader)
				.send({});

			expect(response.status).toBe(500);
			expect(response.body.error).toBe("Internal server error");
		});

		it("returns 500 when inviteUser crashes inside the transaction", async () => {
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

						// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
					} as any;
				}

				// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				return { doc: vi.fn().mockReturnThis() } as any;
			});

			vi.mocked(db.runTransaction).mockRejectedValueOnce(
				new Error("DB crashed"),
			);

			const response = await request(app)
				.post("/api/users/invite")
				.set("Authorization", authHeader)
				.send({ email: "new@x.com", role: "staff" });

			expect(response.status).toBe(500);
			expect(response.body.error).toBe("Internal server error");
		});

		it("returns 500 when updateRole crashes inside the transaction", async () => {
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

				// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				return { doc: vi.fn().mockReturnThis() } as any;
			});

			vi.mocked(db.runTransaction).mockRejectedValueOnce(
				new Error("DB crashed"),
			);

			const response = await request(app)
				.put("/api/users/user123/role")
				.set("Authorization", authHeader)
				.send({ role: "manager", editReason: "Promoting user" });

			expect(response.status).toBe(500);
			expect(response.body.error).toBe("Internal server error");
		});

		it("returns 500 when deleteUser crashes inside the transaction", async () => {
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

				// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				return { doc: vi.fn().mockReturnThis() } as any;
			});

			vi.mocked(db.runTransaction).mockRejectedValueOnce(
				new Error("DB crashed"),
			);

			const response = await request(app)
				.delete("/api/users/some-user")
				.set("Authorization", authHeader)
				.send({ deleteReason: "Testing crash handling" });

			expect(response.status).toBe(500);
			expect(response.body.error).toBe("Internal server error");
		});
	});
});
