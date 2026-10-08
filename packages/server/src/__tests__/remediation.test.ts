import { COLLECTIONS, ROLES } from "@level-up/shared";
import { FieldValue } from "firebase-admin/firestore";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "./setupTests.js";
import app from "../app.js";

const { db, auth } = await import("../firebase.js");

// M-133 / ACP-041 server-side fixes: TD-063, TD-064, TD-068, TD-069.
const authHeader = "Bearer valid-mock-token";
const NOW = new Date("2026-10-08T19:47:00.000Z"); // 22:47 on Oct 8, shop time
const TODAY_FORM = "2026-10-08T00:00:00.000Z"; // what the entry forms send for shop-today
const PAST_FORM = "2026-10-05T00:00:00.000Z";

type Snap = { exists: boolean; data?: () => unknown };
type Tx = {
	get: ReturnType<typeof vi.fn>;
	set: ReturnType<typeof vi.fn>;
	update: ReturnType<typeof vi.fn>;
	delete: ReturnType<typeof vi.fn>;
};
const captured: Tx[] = [];

function wire(
	opts: {
		role?: string;
		docs?: Record<string, Snap>; // `${collection}/${id}` or `${collection}` default
		txGet?: Snap;
	} = {},
) {
	const role = opts.role ?? ROLES.MANAGER;
	vi.mocked(db.collection).mockImplementation((name: string) => {
		const snapFor = (id?: string): Snap => {
			if (name === COLLECTIONS.USERS)
				return {
					exists: true,
					data: () => ({
						role,
						displayName: "Test User",
						email: "member@test.local",
					}),
				};
			return (
				opts.docs?.[`${name}/${id}`] ??
				opts.docs?.[name] ?? { exists: false, data: () => undefined }
			);
		};
		return {
			doc: vi.fn().mockImplementation((id?: string) => ({
				id: id ?? `${name}-new`,
				get: vi.fn().mockResolvedValue(snapFor(id)),
			})),
			get: vi.fn().mockResolvedValue({ docs: [], empty: true }),
			where: vi.fn().mockReturnThis(),
			orderBy: vi.fn().mockReturnThis(),
			limit: vi.fn().mockReturnThis(),
			// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
		} as any;
	});
	captured.length = 0;
	vi.mocked(db.runTransaction).mockImplementation(async (cb: never) => {
		const tx: Tx = {
			get: vi
				.fn()
				.mockResolvedValue(opts.txGet ?? { exists: true, data: () => ({}) }),
			set: vi.fn(),
			update: vi.fn(),
			delete: vi.fn(),
		};
		captured.push(tx);
		// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
		return (cb as any)(tx);
	});
}
const stored = () =>
	captured[0]?.set.mock.calls[0]?.[1] as Record<string, unknown>;

const employeeDoc: Snap = {
	exists: true,
	data: () => ({ name: "Alice Worker", isActive: true }),
};
const rateDoc: Snap = {
	exists: true,
	data: () => ({ game_name: "PS4", price_per_unit: 6, unit_type: "Game" }),
};

const creates: Array<[string, string, Record<string, unknown>]> = [
	[
		"sales",
		"/api/sales",
		{ game_id: "ps4", game_name: "PS4", quantity_sold: 1, rate_applied: 5 },
	],
	["keno", "/api/keno", { net_profit: 10 }],
	["sports betting", "/api/sports-betting", { net_profit: 10 }],
	[
		"expenses",
		"/api/expenses",
		{ item_name: "Tea", description: "tea", amount: 3 },
	],
	[
		"credits",
		"/api/credits",
		{
			employee_id: "e1",
			employee_name: "Alice Worker",
			amount: 20,
			reason: "adv",
		},
	],
];
const docs = { "game_rates/ps4": rateDoc, "employees/e1": employeeDoc };

describe("M-133 server fixes", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers({ toFake: ["Date"] });
		vi.setSystemTime(NOW);
		vi.mocked(auth.verifyIdToken).mockResolvedValue({
			uid: "mock-admin-uid",
			email: "admin@example.com",
		} as never);
	});
	afterEach(() => vi.useRealTimers());

	describe("TD-063 entry dating", () => {
		it.each(creates)(
			"%s: a shop-today form date is stored as the current instant",
			async (_n, path, body) => {
				wire({ docs });
				const res = await request(app)
					.post(path)
					.set("Authorization", authHeader)
					.send({ ...body, date: TODAY_FORM });
				expect(res.status).toBe(201);
				expect(res.body.date).toBe(NOW.toISOString());
				expect(stored().date).toBe(NOW.toISOString());
			},
		);
		it.each(creates)(
			"%s: a backdated form date keeps its chosen day",
			async (_n, path, body) => {
				wire({ docs });
				const res = await request(app)
					.post(path)
					.set("Authorization", authHeader)
					.send({ ...body, date: PAST_FORM });
				expect(res.status).toBe(201);
				expect(res.body.date).toBe(PAST_FORM);
			},
		);
		it.each(creates)(
			"%s: no date sent still uses the current instant",
			async (_n, path, body) => {
				wire({ docs });
				const res = await request(app)
					.post(path)
					.set("Authorization", authHeader)
					.send(body);
				expect(res.body.date).toBe(NOW.toISOString());
			},
		);
	});

	describe("TD-069 invalid date", () => {
		it.each(creates)(
			"%s: garbage date is a 400, not a 500",
			async (_n, path, body) => {
				wire({ docs });
				const res = await request(app)
					.post(path)
					.set("Authorization", authHeader)
					.send({ ...body, date: "garbage" });
				expect(res.status).toBe(400);
				expect(String(res.body.error)).toMatch(/date/i);
			},
		);
	});

	describe("TD-064 credits never write undefined", () => {
		it("a credit without a reason stores no reason key and no undefined values", async () => {
			wire({ docs });
			const res = await request(app)
				.post("/api/credits")
				.set("Authorization", authHeader)
				.send({
					employee_id: "e1",
					employee_name: "Alice Worker",
					amount: 20,
					date: TODAY_FORM,
				});
			expect(res.status).toBe(201);
			const data = stored();
			expect("reason" in data).toBe(false);
			expect(Object.values(data).every((v) => v !== undefined)).toBe(true);
			const audit = captured[0].set.mock.calls[1][1] as {
				new_value: Record<string, unknown>;
			};
			expect(Object.values(audit.new_value).every((v) => v !== undefined)).toBe(
				true,
			);
		});
		it("a credit with a reason still stores it", async () => {
			wire({ docs });
			await request(app)
				.post("/api/credits")
				.set("Authorization", authHeader)
				.send({
					employee_id: "e1",
					employee_name: "Alice Worker",
					amount: 20,
					reason: "Bus fare",
				});
			expect(stored().reason).toBe("Bus fare");
		});
	});

	describe("TD-069 credit employee validation", () => {
		it("rejects a credit for an employee that does not exist", async () => {
			wire({ docs: {} });
			const res = await request(app)
				.post("/api/credits")
				.set("Authorization", authHeader)
				.send({
					employee_id: "ghost",
					employee_name: "Nobody",
					amount: 5,
					reason: "x",
				});
			expect(res.status).toBe(400);
			expect(res.body.error).toBe("Invalid employee");
			expect(captured.length).toBe(0);
		});
		it("rejects a credit for an inactive employee", async () => {
			wire({
				docs: {
					"employees/e1": {
						exists: true,
						data: () => ({ name: "Alice", isActive: false }),
					},
				},
			});
			const res = await request(app)
				.post("/api/credits")
				.set("Authorization", authHeader)
				.send({
					employee_id: "e1",
					employee_name: "Alice",
					amount: 5,
					reason: "x",
				});
			expect(res.status).toBe(400);
			expect(res.body.error).toBe("Invalid employee");
		});
	});

	describe("TD-069 credit status and resolved_date", () => {
		const existing: Snap = {
			exists: true,
			data: () => ({
				employee_id: "e1",
				employee_name: "Alice",
				amount: 20,
				status: "Deducted",
				resolved_date: "2026-10-01T10:00:00.000Z",
				date: PAST_FORM,
			}),
		};
		it("moving a credit back to Pending removes resolved_date (and keeps the audit record legal)", async () => {
			wire({ txGet: existing });
			const res = await request(app)
				.put("/api/credits/c1")
				.set("Authorization", authHeader)
				.send({ status: "Pending", editReason: "marked by mistake" });
			expect(res.status).toBe(200);
			const patch = captured[0].update.mock.calls[0][1] as Record<
				string,
				unknown
			>;
			expect(patch.status).toBe("Pending");
			expect(patch.resolved_date).toBeInstanceOf(FieldValue);
			const audit = captured[0].set.mock.calls[0][1] as {
				new_value: Record<string, unknown>;
			};
			expect("resolved_date" in audit.new_value).toBe(false);
		});
		it("Deducted and Resolved stamp resolved_date with the current instant", async () => {
			for (const status of ["Deducted", "Resolved"]) {
				wire({
					txGet: {
						exists: true,
						data: () => ({ amount: 20, status: "Pending", date: PAST_FORM }),
					},
				});
				await request(app)
					.put("/api/credits/c1")
					.set("Authorization", authHeader)
					.send({ status, editReason: "paid out" });
				const patch = captured[0].update.mock.calls[0][1] as Record<
					string,
					unknown
				>;
				expect(patch.resolved_date).toBe(NOW.toISOString());
			}
		});
		it("editing other fields without a status leaves resolved_date untouched", async () => {
			wire({ txGet: existing });
			await request(app)
				.put("/api/credits/c1")
				.set("Authorization", authHeader)
				.send({ amount: 25, editReason: "typo fix" });
			const patch = captured[0].update.mock.calls[0][1] as Record<
				string,
				unknown
			>;
			expect("resolved_date" in patch).toBe(false);
		});
	});

	describe("TD-069 role changes", () => {
		it("an admin cannot change their own role", async () => {
			wire({ role: ROLES.ADMIN });
			const res = await request(app)
				.put("/api/users/mock-admin-uid/role")
				.set("Authorization", authHeader)
				.send({ role: "staff", editReason: "self demote" });
			expect(res.status).toBe(400);
			expect(res.body.error).toMatch(/own role/i);
			expect(captured.length).toBe(0);
		});
		it("a root admin cannot be demoted", async () => {
			wire({
				role: ROLES.ADMIN,
				txGet: {
					exists: true,
					data: () => ({ email: "jobsbezu@gmail.com", role: "admin" }),
				},
			});
			const res = await request(app)
				.put("/api/users/someone/role")
				.set("Authorization", authHeader)
				.send({ role: "staff", editReason: "demote root" });
			expect(res.status).toBe(400);
			expect(res.body.error).toMatch(/root admin/i);
			expect(captured[0].update).not.toHaveBeenCalled();
		});
		it("an ordinary user can still be promoted", async () => {
			wire({
				role: ROLES.ADMIN,
				txGet: {
					exists: true,
					data: () => ({ email: "staff@test.local", role: "staff" }),
				},
			});
			const res = await request(app)
				.put("/api/users/someone/role")
				.set("Authorization", authHeader)
				.send({ role: "manager", editReason: "shift lead" });
			expect(res.status).toBe(200);
			expect(captured[0].update.mock.calls[0][1]).toEqual({ role: "manager" });
		});
	});

	describe("TD-067 credits can be listed by deduction date", () => {
		const list = async (query: string) => {
			const wheres: Array<[string, string, unknown]> = [];
			const orders: string[] = [];
			vi.mocked(db.collection).mockImplementation((name: string) => {
				// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore query chains requires any
				const chain: any = {
					where: vi.fn((f: string, op: string, v: unknown) => {
						if (name === COLLECTIONS.CREDITS) wheres.push([f, op, v]);
						return chain;
					}),
					orderBy: vi.fn((f: string) => {
						if (name === COLLECTIONS.CREDITS) orders.push(f);
						return chain;
					}),
					limit: vi.fn(() => chain),
					get: vi.fn().mockResolvedValue({ docs: [], empty: true }),
					doc: vi.fn(() => ({
						get: vi.fn().mockResolvedValue({
							exists: true,
							data: () => ({ role: ROLES.MANAGER }),
						}),
					})),
				};
				return chain;
			});
			const res = await request(app)
				.get(`/api/credits${query}`)
				.set("Authorization", authHeader);
			return { res, wheres, orders };
		};
		it("dateField=resolved_date filters and orders by resolved_date", async () => {
			const { res, wheres, orders } = await list(
				"?startDate=2026-10-01T00:00:00.000Z&endDate=2026-10-31T23:59:59.999Z&dateField=resolved_date",
			);
			expect(res.status).toBe(200);
			expect(wheres).toEqual([
				["resolved_date", ">=", "2026-10-01T00:00:00.000Z"],
				["resolved_date", "<=", "2026-10-31T23:59:59.999Z"],
			]);
			expect(orders).toEqual(["resolved_date"]);
		});
		it("the default still filters and orders by the issue date", async () => {
			const { wheres, orders } = await list(
				"?startDate=2026-10-01T00:00:00.000Z",
			);
			expect(wheres).toEqual([["date", ">=", "2026-10-01T00:00:00.000Z"]]);
			expect(orders).toEqual(["date"]);
		});
		it("rejects an unknown dateField", async () => {
			const { res } = await list("?dateField=amount");
			expect(res.status).toBe(400);
		});
	});

	describe("TD-068 editing a sale keeps the rate it was sold at", () => {
		const sale = {
			game_id: "ps4",
			game_name: "PS4",
			quantity_sold: 2,
			rate_applied: 5,
			calculated_total: 10,
			unit_type: "Game",
			date: PAST_FORM,
		};
		const edit = (body: Record<string, unknown>) =>
			request(app)
				.put("/api/sales/s1")
				.set("Authorization", authHeader)
				.send({ editReason: "recount", ...body });
		it("a quantity edit uses the stored rate even though the rate has since changed to 6", async () => {
			wire({
				txGet: { exists: true, data: () => sale },
				docs: { "game_rates/ps4": rateDoc },
			});
			const res = await edit({ quantity_sold: 3 });
			expect(res.status).toBe(200);
			const patch = captured[0].update.mock.calls[0][1] as Record<
				string,
				unknown
			>;
			expect(patch.rate_applied).toBe(5);
			expect(patch.calculated_total).toBe(15);
		});
		it("sending the same game id explicitly changes nothing about the rate", async () => {
			wire({
				txGet: { exists: true, data: () => sale },
				docs: { "game_rates/ps4": rateDoc },
			});
			await edit({ quantity_sold: 4, game_id: "ps4" });
			expect(
				(captured[0].update.mock.calls[0][1] as Record<string, unknown>)
					.calculated_total,
			).toBe(20);
		});
		it("choosing a different game applies that game's current rate", async () => {
			wire({
				txGet: { exists: true, data: () => sale },
				docs: {
					"game_rates/pool": {
						exists: true,
						data: () => ({
							game_name: "Pool",
							price_per_unit: 2,
							unit_type: "Game",
						}),
					},
				},
			});
			await edit({ quantity_sold: 3, game_id: "pool" });
			const patch = captured[0].update.mock.calls[0][1] as Record<
				string,
				unknown
			>;
			expect(patch.rate_applied).toBe(2);
			expect(patch.calculated_total).toBe(6);
			expect(patch.game_name).toBe("Pool");
		});
		it("a legacy sale without a stored rate falls back to the current rate", async () => {
			const { rate_applied: _r, ...legacy } = sale;
			wire({
				txGet: { exists: true, data: () => legacy },
				docs: { "game_rates/ps4": rateDoc },
			});
			await edit({ quantity_sold: 3 });
			expect(
				(captured[0].update.mock.calls[0][1] as Record<string, unknown>)
					.calculated_total,
			).toBe(18);
		});
		it("switching to a game that does not exist is still rejected", async () => {
			wire({ txGet: { exists: true, data: () => sale }, docs: {} });
			const res = await edit({ game_id: "nope" });
			expect(res.status).toBe(400);
		});
		it("the client cannot inject a rate or total", async () => {
			wire({
				txGet: { exists: true, data: () => sale },
				docs: { "game_rates/ps4": rateDoc },
			});
			await edit({
				quantity_sold: 3,
				rate_applied: 999,
				calculated_total: 999,
			});
			const patch = captured[0].update.mock.calls[0][1] as Record<
				string,
				unknown
			>;
			expect(patch.rate_applied).toBe(5);
			expect(patch.calculated_total).toBe(15);
		});
	});
});
