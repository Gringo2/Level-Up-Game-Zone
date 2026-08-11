import type { Response } from "express";
import { describe, expect, it, vi } from "vitest";
import {
	createUser,
	getMe,
	updateRole,
} from "../controllers/usersController.js";
import type { AuthRequest } from "../middleware/auth.js";

// Mock Firebase
vi.mock("../firebase.js", () => ({
	db: {
		collection: vi.fn().mockReturnThis(),
		doc: vi.fn().mockReturnThis(),
		get: vi.fn().mockResolvedValue({
			data: () => ({ role: "staff" }),
			exists: true,
		}),
		runTransaction: vi.fn().mockResolvedValue(true),
	},
}));

describe("Users Controller - Negative Tests", () => {
	it("getMe should return 401 if user is missing from request", async () => {
		const req = {} as AuthRequest;
		const res = {
			status: vi.fn().mockReturnThis(),
			json: vi.fn(),
		} as unknown as Response;

		await getMe(req, res);

		expect(res.status).toHaveBeenCalledWith(401);
		expect(res.json).toHaveBeenCalledWith({ error: "Unauthorized" });
	});
	it("createUser should return 401 if user is missing from request", async () => {
		const req = {} as AuthRequest;
		const res = {
			status: vi.fn().mockReturnThis(),
			json: vi.fn(),
		} as unknown as Response;

		await createUser(req, res);

		expect(res.status).toHaveBeenCalledWith(401);
		expect(res.json).toHaveBeenCalledWith({ error: "Unauthorized" });
	});

	it("updateRole should return 401 if admin user is missing", async () => {
		const req = {
			params: { id: "123" },
			body: { role: "manager", editReason: "promoted" },
		} as unknown as AuthRequest;
		const res = {
			status: vi.fn().mockReturnThis(),
			json: vi.fn(),
		} as unknown as Response;

		await updateRole(req, res);

		expect(res.status).toHaveBeenCalledWith(401);
		expect(res.json).toHaveBeenCalledWith({ error: "Unauthorized" });
	});

	it("updateRole should return 400 if editReason is missing", async () => {
		const req = {
			user: { uid: "admin123" },
			params: { id: "123" },
			body: { role: "manager" },
		} as unknown as AuthRequest;
		const res = {
			status: vi.fn().mockReturnThis(),
			json: vi.fn(),
		} as unknown as Response;

		await updateRole(req, res);

		expect(res.status).toHaveBeenCalledWith(400);
		expect(res.json).toHaveBeenCalledWith({
			error: "Edit reason is required",
		});
	});

	it("updateRole should return 403 if requester is not an admin", async () => {
		const req = {
			user: { uid: "staff123" },
			params: { id: "123" },
			body: { role: "manager", editReason: "test" },
		} as unknown as AuthRequest;
		const res = {
			status: vi.fn().mockReturnThis(),
			json: vi.fn(),
		} as unknown as Response;

		await updateRole(req, res);

		expect(res.status).toHaveBeenCalledWith(403);
		expect(res.json).toHaveBeenCalledWith({ error: "Forbidden: Admins only" });
	});
});
