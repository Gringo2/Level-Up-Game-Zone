import type { NextFunction, Response } from "express";
import { describe, expect, it, vi } from "vitest";
import type { AuthRequest } from "../middleware/auth.js";
import { makeRequireAuth } from "../middleware/auth.js";

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
