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

// M-134 / ACP-042: month-end data against real Firestore query semantics.
let h: Harness;
let manager: Account;
let admin: Account;

// shop-day range for a calendar month (UTC+3): from 00:00 of day 1 to 23:59:59.999 of the last day
const SEP = {
	startDate: "2026-08-31T21:00:00.000Z",
	endDate: "2026-09-30T20:59:59.999Z",
};
const OCT = {
	startDate: "2026-09-30T21:00:00.000Z",
	endDate: "2026-10-31T20:59:59.999Z",
};
const q = (r: { startDate: string; endDate: string }, extra = "") =>
	`?startDate=${encodeURIComponent(r.startDate)}&endDate=${encodeURIComponent(r.endDate)}${extra}`;

describe("month-end data (real SDK + emulators)", () => {
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
		admin = await createMember(h.db, "ada@test.local", "admin", "Ada Admin");
		await h.db.collection("employees").doc("e1").set({
			name: "Alice Worker",
			isActive: true,
			base_salary: 3000,
			hired_date: "2026-01-01",
			position: "Cashier",
			break_day: null,
			created_at: "2026-01-01T00:00:00.000Z",
		});
		await h.db.collection("game_rates").doc("ps4").set({
			game_name: "PS4",
			price_per_unit: 5,
			unit_type: "Game",
			isActive: true,
		});
		vi.useFakeTimers({ toFake: ["Date"] });
		vi.setSystemTime(new Date("2026-10-08T07:00:00.000Z"));
	});
	afterEach(() => vi.useRealTimers());

	it("puts an entry at 23:30 on Sep 30 in September and one at 00:30 on Oct 1 in October", async () => {
		const a = await call(h.app, "post", "/api/keno", manager.token, {
			net_profit: 7,
			date: "2026-09-30T20:30:00.000Z",
		});
		const b = await call(h.app, "post", "/api/keno", manager.token, {
			net_profit: 1000,
			date: "2026-09-30T21:30:00.000Z",
		});
		expect([a.status, b.status]).toEqual([201, 201]);
		expect(a.body.date).toBe("2026-09-30T20:30:00.000Z"); // a time of day is never altered
		const sep = await call(h.app, "get", `/api/keno${q(SEP)}`, manager.token);
		const oct = await call(h.app, "get", `/api/keno${q(OCT)}`, manager.token);
		expect(sep.body.map((r: { net_profit: number }) => r.net_profit)).toEqual([
			7,
		]);
		expect(oct.body.map((r: { net_profit: number }) => r.net_profit)).toEqual([
			1000,
		]);
	});

	it("lists deductions by the day they were deducted, not the day they were issued", async () => {
		const issue = async (amount: number, ymd: string) =>
			(
				await call(h.app, "post", "/api/credits", manager.token, {
					employee_id: "e1",
					employee_name: "Alice Worker",
					amount,
					reason: "adv",
					date: formDate(ymd),
				})
			).body.id as string;
		const sep12 = await issue(50, "2026-09-12");
		const sep28 = await issue(60, "2026-09-28");
		vi.setSystemTime(new Date("2026-09-30T07:00:00.000Z"));
		await call(h.app, "put", `/api/credits/${sep12}`, manager.token, {
			status: "Deducted",
			editReason: "taken in Sep",
		});
		vi.setSystemTime(new Date("2026-10-03T07:00:00.000Z"));
		await call(h.app, "put", `/api/credits/${sep28}`, manager.token, {
			status: "Deducted",
			editReason: "taken in Oct",
		});

		const amounts = async (range: typeof SEP, extra: string) => {
			const res = await call(
				h.app,
				"get",
				`/api/credits${q(range, extra)}`,
				manager.token,
			);
			return res.body
				.map((c: { amount: number }) => c.amount)
				.sort((x: number, y: number) => x - y);
		};
		expect(await amounts(SEP, "&dateField=resolved_date")).toEqual([50]);
		expect(await amounts(OCT, "&dateField=resolved_date")).toEqual([60]);
		expect(await amounts(SEP, "")).toEqual([50, 60]); // by issue date both belong to September
		expect(
			(await call(h.app, "get", "/api/credits?dateField=amount", manager.token))
				.status,
		).toBe(400);
	});

	it("keeps the rate a sale was made at when its quantity is corrected after a price change", async () => {
		const sale = await call(h.app, "post", "/api/sales", manager.token, {
			game_id: "ps4",
			game_name: "PS4",
			quantity_sold: 2,
			rate_applied: 5,
			date: formDate("2026-10-08"),
		});
		expect(sale.body.calculated_total).toBe(10);
		const rate = await call(h.app, "put", "/api/rates/ps4", admin.token, {
			price_per_unit: 6,
			editReason: "price rise",
		});
		expect(rate.status).toBe(200);
		const fixed = await call(
			h.app,
			"put",
			`/api/sales/${sale.body.id}`,
			manager.token,
			{ quantity_sold: 3, editReason: "recount" },
		);
		expect(fixed.status).toBe(200);
		expect(fixed.body).toMatchObject({ rate_applied: 5, calculated_total: 15 });
		const fresh = await call(h.app, "post", "/api/sales", manager.token, {
			game_id: "ps4",
			game_name: "PS4",
			quantity_sold: 1,
			rate_applied: 5,
			date: formDate("2026-10-08"),
		});
		expect(fresh.body).toMatchObject({ rate_applied: 6, calculated_total: 6 }); // new sales use the new rate
	});

	it("pages through a long list with the real cursor and loses or repeats nothing", async () => {
		for (let i = 1; i <= 5; i++) {
			await call(h.app, "post", "/api/keno", manager.token, {
				net_profit: i,
				date: `2026-09-${String(10 + i)}T09:00:00.000Z`,
			});
		}
		const seen: number[] = [];
		let cursor: string | null = null;
		for (let page = 0; page < 5; page++) {
			const res: {
				body: {
					data: Array<{ net_profit: number }>;
					nextCursor: string | null;
				};
			} = await call(
				h.app,
				"get",
				`/api/keno${q(SEP, `&limit=2${cursor ? `&cursor=${cursor}` : ""}`)}`,
				manager.token,
			);
			seen.push(...res.body.data.map((r) => r.net_profit));
			cursor = res.body.nextCursor;
			if (!cursor) break;
		}
		expect(seen).toEqual([5, 4, 3, 2, 1]); // newest first, each exactly once
	});
});
