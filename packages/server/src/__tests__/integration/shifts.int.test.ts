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
	type Harness,
	resetEmulators,
} from "./harness.js";

// M-134 / ACP-042: shift days and forgotten shifts against the real SDK.
// Guards TD-065 (host timezone) and TD-066 (closing a MISSED shift). Run under
// TZ=UTC (npm run test:integration does) so a UTC host is the default case.
const NOW = new Date("2026-10-08T07:00:00.000Z"); // 10:00 on Oct 8, shop time
let h: Harness;
let manager: Account;

const shift = (
	id: string,
	start: string,
	extra: Record<string, unknown> = {},
) =>
	h.db
		.collection("shifts")
		.doc(id)
		.set({
			manager_id: manager.uid,
			manager_name: "Mona Manager",
			start_time: start,
			opening_float: 100,
			status: "OPEN",
			...extra,
		});
const statusOf = async (id: string) =>
	(await h.db.collection("shifts").doc(id).get()).data()?.status;

describe("shift days and missed shifts (real SDK + emulators)", () => {
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
		vi.useFakeTimers({ toFake: ["Date"] });
		vi.setSystemTime(NOW);
	});
	afterEach(() => vi.useRealTimers());

	it("does not relabel an in-progress shift opened at 00:30 shop time as MISSED", async () => {
		await shift("early", "2026-10-07T21:30:00.000Z"); // 00:30 on Oct 8 in shop time
		await shift("stale", "2026-10-07T10:00:00.000Z"); // 13:00 on Oct 7: a real leftover
		const res = await call(h.app, "get", "/api/shifts", manager.token);
		expect(res.status).toBe(200);
		expect(await statusOf("early")).toBe("OPEN");
		expect(await statusOf("stale")).toBe("MISSED");
	});

	it("lists the shop days between the last shift and today as gaps", async () => {
		await shift("last", "2026-10-05T06:00:00.000Z", {
			status: "CLOSED",
			end_time: "2026-10-05T15:00:00.000Z",
		});
		const res = await call(h.app, "get", "/api/shifts/missed", manager.token);
		expect(res.body.gapDates).toEqual(["2026-10-06", "2026-10-07"]);
		expect(res.body.missedShifts).toEqual([]);
	});

	it("refuses a second auto-open when a shift was closed at 01:00 shop time today", async () => {
		await shift("done", "2026-10-07T22:00:00.000Z", {
			status: "CLOSED",
			end_time: "2026-10-08T03:00:00.000Z",
		});
		const res = await call(
			h.app,
			"post",
			"/api/shifts/auto-open",
			manager.token,
			{ floatAmount: 0, managerName: "Mona" },
		);
		expect(res.status).toBe(409);
	});

	it("closes a forgotten shift with totals bounded to its own day", async () => {
		await shift("old", "2026-10-05T06:00:00.000Z"); // 09:00 on Oct 5
		const sale = (id: string, date: string, total: number) =>
			h.db
				.collection("game_sales_logs")
				.doc(id)
				.set({
					game_id: "ps4",
					game_name: "PS4",
					quantity_sold: total / 5,
					rate_applied: 5,
					calculated_total: total,
					user_id: manager.uid,
					date,
				});
		await sale("sameDay", "2026-10-05T08:00:00.000Z", 40);
		await sale("laterDay", "2026-10-06T08:00:00.000Z", 500);

		const listed = await call(
			h.app,
			"get",
			"/api/shifts/missed",
			manager.token,
		);
		expect(listed.body.missedShifts.map((s: { id: string }) => s.id)).toEqual([
			"old",
		]);

		const closed = await call(
			h.app,
			"post",
			"/api/shifts/old/close",
			manager.token,
			{ actualCashCounted: 140, shortageReason: "Forgot to close on the day" },
		);
		expect(closed.status).toBe(200);
		expect(closed.body.data).toMatchObject({
			expected_cash_calculated: 140,
			variance: 0,
			status: "CLOSED",
			end_time: "2026-10-05T20:59:59.999Z",
		});

		const after = await call(h.app, "get", "/api/shifts/missed", manager.token);
		expect(after.body.missedShifts).toEqual([]);
		const again = await call(
			h.app,
			"post",
			"/api/shifts/old/close",
			manager.token,
			{ actualCashCounted: 140, shortageReason: "again" },
		);
		expect(again.status).toBe(400);
		const audit = (
			await h.db.collection("audit_logs").where("record_id", "==", "old").get()
		).docs.map((d) => d.data().reason_for_change);
		expect(
			audit.some((r) => String(r).startsWith("Resolved missed shift")),
		).toBe(true);
	});
});
