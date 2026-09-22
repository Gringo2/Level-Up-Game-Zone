import type { NextFunction, Response } from "express";
import { describe, expect, it, vi } from "vitest";

vi.mock("../firebase.js", () => ({
	auth: { verifyIdToken: vi.fn() },
	db: { collection: vi.fn() },
}));

import type { AuthRequest } from "../middleware/auth.js";
import { makeRequireAuth, requireRole } from "../middleware/auth.js";
import { getUserRole } from "../utils/roleLookup.js";

const { db } = await import("../firebase.js");

function makeRes() {
	const res = {
		status: vi.fn(),
		json: vi.fn(),
	} as unknown as Response;
	(res.status as ReturnType<typeof vi.fn>).mockReturnValue(res);
	return res;
}

describe("requireAuth middleware", () => {
	it("returns 401 when Authorization header is missing", async () => {
		const verifier = vi.fn();
		const middleware = makeRequireAuth(verifier);
		const req = { headers: {} } as AuthRequest;
		const res = makeRes();
		const next = vi.fn() as unknown as NextFunction;

		await middleware(req, res, next);

		expect(res.status).toHaveBeenCalledWith(401);
		expect(res.json).toHaveBeenCalledWith({
			error: "Unauthorized: No token provided",
		});
		expect(next).not.toHaveBeenCalled();
		expect(verifier).not.toHaveBeenCalled();
	});

	it("returns 401 when Authorization header does not start with Bearer", async () => {
		const verifier = vi.fn();
		const middleware = makeRequireAuth(verifier);
		const req = {
			headers: { authorization: "Basic abc123" },
		} as AuthRequest;
		const res = makeRes();
		const next = vi.fn() as unknown as NextFunction;

		await middleware(req, res, next);

		expect(res.status).toHaveBeenCalledWith(401);
		expect(res.json).toHaveBeenCalledWith({
			error: "Unauthorized: No token provided",
		});
		expect(next).not.toHaveBeenCalled();
	});

	it("returns 401 when the verifier throws (invalid token)", async () => {
		const verifier = vi
			.fn()
			.mockRejectedValue(new Error("Token verification failed"));
		const middleware = makeRequireAuth(verifier);
		const req = {
			headers: { authorization: "Bearer bad-token" },
		} as AuthRequest;
		const res = makeRes();
		const next = vi.fn() as unknown as NextFunction;

		await middleware(req, res, next);

		expect(res.status).toHaveBeenCalledWith(401);
		expect(res.json).toHaveBeenCalledWith({
			error: "Unauthorized: Invalid token",
		});
		expect(next).not.toHaveBeenCalled();
	});

	it("calls next() and attaches decoded user when token is valid", async () => {
		const fakeDecodedToken = { uid: "user123", email: "user@example.com" };
		const verifier = vi.fn().mockResolvedValue(fakeDecodedToken);
		const middleware = makeRequireAuth(verifier);
		const req = {
			headers: { authorization: "Bearer valid-token" },
		} as AuthRequest;
		const res = makeRes();
		const next = vi.fn() as unknown as NextFunction;

		await middleware(req, res, next);

		expect(verifier).toHaveBeenCalledWith("valid-token");
		expect(req.user).toEqual(fakeDecodedToken);
		expect(next).toHaveBeenCalledOnce();
		expect(res.status).not.toHaveBeenCalled();
	});
});

describe("getUserRole / requireRole (real Firestore lookup)", () => {
	const mockUserDoc = (snap: { exists: boolean; data?: () => unknown }) => {
		vi.mocked(db.collection).mockReturnValue({
			doc: () => ({ get: vi.fn().mockResolvedValue(snap) }),
			// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
		} as any);
	};

	it("returns the stored role, or undefined when the profile is missing", async () => {
		mockUserDoc({ exists: true, data: () => ({ role: "manager" }) });
		expect(await getUserRole("u1")).toBe("manager");
		mockUserDoc({ exists: false });
		expect(await getUserRole("u1")).toBeUndefined();
	});

	it("rejects a staff account from the manager/admin operator gate", async () => {
		mockUserDoc({ exists: true, data: () => ({ role: "staff" }) });
		const req = { user: { uid: "u1" } } as unknown as AuthRequest;
		const res = makeRes();
		const next = vi.fn() as unknown as NextFunction;
		await requireRole(["manager", "admin"])(req, res, next);
		expect(res.status).toHaveBeenCalledWith(403);
		expect(next).not.toHaveBeenCalled();
	});

	it("lets a manager through the operator gate", async () => {
		mockUserDoc({ exists: true, data: () => ({ role: "manager" }) });
		const req = { user: { uid: "u1" } } as unknown as AuthRequest;
		const next = vi.fn() as unknown as NextFunction;
		await requireRole(["manager", "admin"])(req, makeRes(), next);
		expect(next).toHaveBeenCalled();
	});
});

describe("makeRequireAuth when a token was already verified upstream", () => {
	it("skips re-verification and calls next", async () => {
		const verifier = vi.fn();
		const req = {
			headers: {},
			user: { uid: "u1" },
		} as unknown as AuthRequest;
		const next = vi.fn() as unknown as NextFunction;
		await makeRequireAuth(verifier)(req, makeRes(), next);
		expect(verifier).not.toHaveBeenCalled();
		expect(next).toHaveBeenCalled();
	});
});
