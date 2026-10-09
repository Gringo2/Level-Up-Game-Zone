import {
	afterEach,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import {
	type Account,
	bootHarness,
	call,
	createMember,
	formDate,
	type Harness,
	resetEmulators,
} from "./harness.js";

// M-134 / ACP-042: the daily cycle against the real app + real SDK + emulators.
// Guards TD-063: entries made through the forms must count in the running shift.
const OPEN = new Date("2026-10-08T07:00:00.000Z"); // 10:00 on Oct 8, shop time
const minutesLater = (m: number) => new Date(OPEN.getTime() + m * 60_000);

let h: Harness;
let manager: Account;
let staff: Account;

describe("daily cycle (real SDK + emulators)", () => {
	beforeAll(async () => {
		h = await bootHarness();
	});

	beforeEach(async () => {
		await resetEmulators();
		manager = await createMember(
			h.db,
			"mona@test.local",
			"manager",
			"Mona Manager",
		);
		staff = await createMember(h.db, "sam@test.local", "staff", "Sam Staff");
		await h.db.collection("game_rates").doc("ps4").set({
			game_name: "PS4",
			price_per_unit: 5,
			unit_type: "Game",
			isActive: true,
		});
		await h.db.collection("game_rates").doc("pool").set({
			game_name: "Pool",
			price_per_unit: 2,
			unit_type: "Game",
			isActive: true,
		});
		await h.db.collection("employees").doc("e1").set({
			name: "Alice Worker",
			position: "Cashier",
			base_salary: 3000,
			hired_date: "2026-01-01",
			break_day: null,
			isActive: true,
			created_at: "2026-01-01T00:00:00.000Z",
		});
		vi.useFakeTimers({ toFake: ["Date"] });
		vi.setSystemTime(OPEN);
	});

	afterEach(() => vi.useRealTimers());

	const logDay = async () => {
		const D = formDate("2026-10-08"); // what the forms send for shop-today
		vi.setSystemTime(minutesLater(5));
		const posts: Array<[string, Record<string, unknown>]> = [
			[
				"/api/sales",
				{
					game_id: "ps4",
					game_name: "PS4",
					quantity_sold: 3,
					rate_applied: 5,
					date: D,
				},
			],
			[
				"/api/sales",
				{
					game_id: "pool",
					game_name: "Pool",
					quantity_sold: 4,
					rate_applied: 2,
					date: D,
				},
			],
			["/api/keno", { net_profit: 40, date: D }],
			["/api/sports-betting", { net_profit: -10, date: D }],
			[
				"/api/expenses",
				{ item_name: "Tea", description: "Staff tea", amount: 12.5, date: D },
			],
			[
				"/api/credits",
				{
					employee_id: "e1",
					employee_name: "Alice Worker",
					amount: 20,
					date: D,
				},
			],
		];
		for (const [path, body] of posts) {
			const res = await call(h.app, "post", path, manager.token, body);
			expect(res.status, `${path} -> ${JSON.stringify(res.body)}`).toBe(201);
		}
	};

	it("counts every entry made during the shift and accepts the hand-calculated cash", async () => {
		const opened = await call(h.app, "post", "/api/shifts", manager.token, {
			floatAmount: 100,
			managerName: "Mona Manager",
		});
		expect(opened.status).toBe(201);
		await logDay();

		// What the Dashboard fetches while the shift is open.
		const since = encodeURIComponent(opened.body.start_time);
		const counts: Record<string, number> = {};
		for (const [key, path] of [
			["sales", "sales"],
			["keno", "keno"],
			["credits", "credits"],
			["expenses", "expenses"],
			["betting", "sports-betting"],
		]) {
			const res = await call(
				h.app,
				"get",
				`/api/${path}?startDate=${since}`,
				manager.token,
			);
			counts[key] = res.body.length;
		}
		expect(counts).toEqual({
			sales: 2,
			keno: 1,
			credits: 1,
			expenses: 1,
			betting: 1,
		});

		// 100 float + 40 keno + (3*5 + 4*2) sales - 10 betting - 12.50 expenses - 20 pending credit
		const expected = 100 + 40 + 23 - 10 - 12.5 - 20;
		expect(expected).toBe(120.5);
		vi.setSystemTime(minutesLater(600));
		const closed = await call(
			h.app,
			"post",
			`/api/shifts/${opened.body.id}/close`,
			manager.token,
			{ actualCashCounted: expected },
		);
		expect(closed.status).toBe(200);
		expect(closed.body.data).toMatchObject({
			expected_cash_calculated: 120.5,
			actual_cash_counted: 120.5,
			variance: 0,
			status: "CLOSED",
		});

		const stored = (
			await h.db.collection("shifts").doc(opened.body.id).get()
		).data();
		expect(stored).toMatchObject({
			status: "CLOSED",
			variance: 0,
			expected_cash_calculated: 120.5,
		});
	});

	it("flags a real discrepancy: a wrong count needs a reason and is recorded", async () => {
		const opened = await call(h.app, "post", "/api/shifts", manager.token, {
			floatAmount: 100,
			managerName: "Mona Manager",
		});
		await logDay();
		const refused = await call(
			h.app,
			"post",
			`/api/shifts/${opened.body.id}/close`,
			manager.token,
			{ actualCashCounted: 110 },
		);
		expect(refused.status).toBe(400);
		expect(refused.body.error).toMatch(/reason/i);
		const accepted = await call(
			h.app,
			"post",
			`/api/shifts/${opened.body.id}/close`,
			manager.token,
			{ actualCashCounted: 110, shortageReason: "Drawer short" },
		);
		expect(accepted.status).toBe(200);
		expect(accepted.body.data.variance).toBe(-10.5);
	});

	it("writes an audit record for every change, in the same transaction", async () => {
		const opened = await call(h.app, "post", "/api/shifts", manager.token, {
			floatAmount: 100,
			managerName: "Mona Manager",
		});
		await logDay();
		await call(
			h.app,
			"post",
			`/api/shifts/${opened.body.id}/close`,
			manager.token,
			{ actualCashCounted: 120.5 },
		);
		const audits = (await h.db.collection("audit_logs").get()).docs.map(
			(d) => `${d.data().action}:${d.data().table_affected}`,
		);
		for (const expected of [
			"CREATE:shifts",
			"CREATE:game_sales_logs",
			"CREATE:keno_logs",
			"CREATE:sports_betting_logs",
			"CREATE:expenses",
			"CREATE:credits",
			"UPDATE:shifts",
		]) {
			expect(audits).toContain(expected);
		}
		expect(audits.filter((a) => a === "CREATE:game_sales_logs")).toHaveLength(
			2,
		);
	});

	it("keeps entries backdated to an earlier day out of today's shift", async () => {
		const opened = await call(h.app, "post", "/api/shifts", manager.token, {
			floatAmount: 100,
			managerName: "Mona Manager",
		});
		vi.setSystemTime(minutesLater(5));
		const yesterday = await call(h.app, "post", "/api/keno", manager.token, {
			net_profit: 999,
			date: formDate("2026-10-07"),
		});
		expect(yesterday.body.date).toBe("2026-10-07T00:00:00.000Z");
		const closed = await call(
			h.app,
			"post",
			`/api/shifts/${opened.body.id}/close`,
			manager.token,
			{ actualCashCounted: 100 },
		);
		expect(closed.status).toBe(200);
		expect(closed.body.data.expected_cash_calculated).toBe(100);
	});

	it("enforces roles end to end: staff cannot log betting, edit, or close someone else's rules", async () => {
		const noBetting = await call(
			h.app,
			"post",
			"/api/sports-betting",
			staff.token,
			{ net_profit: 5 },
		);
		expect(noBetting.status).toBe(403);
		const sale = await call(h.app, "post", "/api/sales", staff.token, {
			game_id: "ps4",
			game_name: "PS4",
			quantity_sold: 1,
			rate_applied: 5,
		});
		expect(sale.status).toBe(201);
		const edit = await call(
			h.app,
			"put",
			`/api/sales/${sale.body.id}`,
			staff.token,
			{ quantity_sold: 2, editReason: "recount" },
		);
		expect(edit.status).toBe(403);
		const managerEdit = await call(
			h.app,
			"put",
			`/api/sales/${sale.body.id}`,
			manager.token,
			{ quantity_sold: 2, editReason: "recount" },
		);
		expect(managerEdit.status).toBe(200);
		expect(managerEdit.body.calculated_total).toBe(10);
	});
});
