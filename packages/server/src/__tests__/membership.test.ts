import { COLLECTIONS, ROLES } from "@level-up/shared";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import "./setupTests.js";
import app from "../app.js";

const { db, auth } = await import("../firebase.js");

// M-132 / ACP-040: a valid Firebase token is not membership. Only callers
// with a users/{uid} document may reach the API, except self-registration.
const NOT_REGISTERED = "Forbidden: Account not registered";
const authHeader = "Bearer valid-mock-token";

function mockUsersDoc(userDoc: { exists: boolean; data?: () => unknown }) {
	const userGet = vi.fn().mockResolvedValue(userDoc);
	// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore query chains requires any
	const chain: any = {
		get: vi.fn().mockResolvedValue({ exists: false, docs: [], empty: true }),
		where: vi.fn().mockReturnThis(),
		orderBy: vi.fn().mockReturnThis(),
		limit: vi.fn().mockReturnThis(),
		doc: vi.fn().mockReturnValue({
			id: "new-doc",
			get: vi.fn().mockResolvedValue({ exists: false }),
		}),
	};
	vi.mocked(db.collection).mockImplementation((path: string) => {
		if (path === COLLECTIONS.USERS) {
			// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
			return { doc: vi.fn().mockReturnValue({ get: userGet }) } as any;
		}
		return chain;
	});
	return userGet;
}

const memberRoutes: Array<[string, string]> = [
	["get", "/api/shifts"],
	["get", "/api/shifts/missed"],
	["post", "/api/shifts"],
	["post", "/api/shifts/auto-open"],
	["post", "/api/shifts/shift-1/close"],
	["put", "/api/shifts/shift-1/float"],
	["get", "/api/sales"],
	["post", "/api/sales"],
	["put", "/api/sales/s-1/verify"],
	["get", "/api/keno"],
	["post", "/api/keno"],
	["get", "/api/sports-betting"],
	["post", "/api/sports-betting"],
	["get", "/api/expenses"],
	["post", "/api/expenses"],
	["get", "/api/expense-categories"],
	["post", "/api/expense-categories"],
	["put", "/api/expense-categories/c-1"],
	["get", "/api/rates"],
	["post", "/api/rates"],
	["get", "/api/credits"],
	["post", "/api/credits"],
	["get", "/api/employees"],
	["get", "/api/users"],
	["get", "/api/audit-logs"],
];

describe("M-132 API membership gate", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(auth.verifyIdToken).mockResolvedValue({
			uid: "stranger-uid",
			email: "stranger@gmail.com",
		} as never);
	});

	describe("unregistered token (no users/{uid} document)", () => {
		it.each(memberRoutes)(
			"%s %s -> 403 not registered",
			async (method, path) => {
				mockUsersDoc({ exists: false });

				const response = await (
					request(app) as unknown as Record<string, (p: string) => request.Test>
				)
					[method](path)
					.set("Authorization", authHeader)
					.send({});

				expect(response.status).toBe(403);
				expect(response.body).toEqual({ error: NOT_REGISTERED });
			},
		);

		it("can still read its own registration state (GET /api/users/me -> 404)", async () => {
			mockUsersDoc({ exists: false });

			const response = await request(app)
				.get("/api/users/me")
				.set("Authorization", authHeader);

			expect(response.status).toBe(404);
		});

		it("can still self-register with an invite (POST /api/users -> 201)", async () => {
			vi.mocked(auth.verifyIdToken).mockResolvedValue({
				uid: "invitee-uid",
				email: "invitee@gmail.com",
			} as never);
			vi.mocked(db.collection).mockImplementation((path: string) => {
				// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				const docRef: any = {
					id: "x",
					get: vi
						.fn()
						.mockResolvedValue(
							path === COLLECTIONS.USER_INVITES
								? { exists: true, data: () => ({ role: ROLES.STAFF }) }
								: { exists: false },
						),
				};
				// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				return { doc: vi.fn().mockReturnValue(docRef) } as any;
			});
			vi.mocked(db.runTransaction).mockImplementationOnce(
				// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
				async (callback: any) =>
					callback({
						get: vi.fn().mockResolvedValue({ exists: false }),
						set: vi.fn(),
						delete: vi.fn(),
					}),
			);

			const response = await request(app)
				.post("/api/users")
				.set("Authorization", authHeader)
				.send({});

			expect(response.status).toBe(201);
			expect(response.body.role).toBe(ROLES.STAFF);
		});
	});

	describe("registered members", () => {
		it("staff keeps daily-logging read access (GET /api/credits -> 200)", async () => {
			mockUsersDoc({ exists: true, data: () => ({ role: ROLES.STAFF }) });

			const response = await request(app)
				.get("/api/credits")
				.set("Authorization", authHeader);

			expect(response.status).toBe(200);
		});

		it("staff keeps TD-025 create access (POST /api/expense-categories -> 201)", async () => {
			mockUsersDoc({ exists: true, data: () => ({ role: ROLES.STAFF }) });

			const response = await request(app)
				.post("/api/expense-categories")
				.set("Authorization", authHeader)
				.send({ name: "Snacks" });

			expect(response.status).toBe(201);
		});

		it("staff is still refused role-gated routes with the role error", async () => {
			mockUsersDoc({ exists: true, data: () => ({ role: ROLES.STAFF }) });

			const response = await request(app)
				.get("/api/audit-logs")
				.set("Authorization", authHeader);

			expect(response.status).toBe(403);
			expect(response.body).toEqual({
				error: "Forbidden: Insufficient role permissions",
			});
		});

		it("role-gated request reads the user document exactly once", async () => {
			const userGet = mockUsersDoc({
				exists: true,
				data: () => ({ role: ROLES.ADMIN }),
			});

			const response = await request(app)
				.get("/api/audit-logs")
				.set("Authorization", authHeader);

			expect(response.status).toBe(200);
			expect(userGet).toHaveBeenCalledTimes(1);
		});

		it("membership lookup failure answers 500, never passes through", async () => {
			vi.mocked(db.collection).mockImplementation(() => {
				throw new Error("DB down");
			});

			const response = await request(app)
				.get("/api/credits")
				.set("Authorization", authHeader);

			expect(response.status).toBe(500);
		});
	});
});
