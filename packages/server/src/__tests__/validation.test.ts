import type { NextFunction, Response } from "express";
import { describe, expect, it, vi } from "vitest";
import type { AuthRequest } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import {
	CreateExpenseSchema,
	CreateGameRateSchema,
	CreateSaleSchema,
	UpdateRoleSchema,
} from "../schemas/index.js";

function makeRes() {
	const res = {
		status: vi.fn(),
		json: vi.fn(),
	} as unknown as Response;
	(res.status as ReturnType<typeof vi.fn>).mockReturnValue(res);
	return res;
}

describe("Domain-Driven Schema Validation Middleware", () => {
	it("rejects NaN quantity_sold on game sales logging", () => {
		const middleware = validateBody(CreateSaleSchema);
		const req = {
			body: {
				game_name: "PS5",
				quantity_sold: "abc",
				rate_applied: 10,
				calculated_total: 10,
			},
		} as AuthRequest;
		const res = makeRes();
		const next = vi.fn() as unknown as NextFunction;

		middleware(req, res, next);

		expect(res.status).toHaveBeenCalledWith(400);
		expect(res.json).toHaveBeenCalledWith({
			error: "Quantity sold must be a valid number",
		});
		expect(next).not.toHaveBeenCalled();
	});

	it("rejects invalid unit_type on game rate creation", () => {
		const middleware = validateBody(CreateGameRateSchema);
		const req = {
			body: {
				game_name: "Pool Table",
				price_per_unit: 15,
				unit_type: "Month",
			},
		} as AuthRequest;
		const res = makeRes();
		const next = vi.fn() as unknown as NextFunction;

		middleware(req, res, next);

		expect(res.status).toHaveBeenCalledWith(400);
		expect(res.json).toHaveBeenCalledWith({
			error: "Unit type must be 'Hour' or 'Game'",
		});
		expect(next).not.toHaveBeenCalled();
	});

	it("rejects invalid role on user role update", () => {
		const middleware = validateBody(UpdateRoleSchema);
		const req = {
			body: {
				role: "super_hacker",
				editReason: "Testing security",
			},
		} as AuthRequest;
		const res = makeRes();
		const next = vi.fn() as unknown as NextFunction;

		middleware(req, res, next);

		expect(res.status).toHaveBeenCalledWith(400);
		expect(res.json).toHaveBeenCalledWith({
			error: "Role must be 'admin', 'manager', or 'staff'",
		});
		expect(next).not.toHaveBeenCalled();
	});

	it("rejects blank editReason on update", () => {
		const middleware = validateBody(UpdateRoleSchema);
		const req = {
			body: {
				role: "manager",
				editReason: "  ",
			},
		} as AuthRequest;
		const res = makeRes();
		const next = vi.fn() as unknown as NextFunction;

		middleware(req, res, next);

		expect(res.status).toHaveBeenCalledWith(400);
		expect(res.json).toHaveBeenCalledWith({
			error: "Reason for change must be at least 3 characters",
		});
		expect(next).not.toHaveBeenCalled();
	});

	it("coerces and passes sanitized data to next() when payload is valid", () => {
		const middleware = validateBody(CreateExpenseSchema);
		const req = {
			body: {
				item_name: "Office Supplies",
				description: "  Office Supplies  ",
				amount: "45.50",
				category: "Supplies",
			},
		} as AuthRequest;
		const res = makeRes();
		const next = vi.fn() as unknown as NextFunction;

		middleware(req, res, next);

		expect(next).toHaveBeenCalledOnce();
		expect(req.body).toEqual({
			item_name: "Office Supplies",
			description: "Office Supplies",
			amount: 45.5,
			category: "Supplies",
		});
	});
});
