import { COLLECTIONS, ROLES } from "@level-up/shared";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "./setupTests.js";
import app from "../app.js";

const { db, auth } = await import("../firebase.js");

// M-133 / ACP-041: TD-065 (shop-time shift days) and TD-066 (closing a MISSED shift).
// These tests must pass under any host timezone: run with TZ=UTC and TZ=America/New_York too.
const authHeader = "Bearer valid-mock-token";
const NOW = new Date("2026-10-08T19:47:00.000Z"); // 22:47 on Oct 8, shop time

type Doc = {
	id: string;
	data: () => Record<string, unknown>;
	ref: { update: ReturnType<typeof vi.fn> };
};
const doc = (id: string, data: Record<string, unknown>): Doc => ({
	id,
	data: () => data,
	ref: { update: vi.fn() },
});
type Filter = [string, string, unknown];

function wire(opts: {
	shifts?: (filters: Filter[], limited: boolean) => Doc[];
	shiftById?: Record<string, unknown>;
	dataCollections?: Record<string, Filter[]>; // records where() calls per collection
}) {
	vi.mocked(db.collection).mockImplementation((name: string) => {
		const filters: Filter[] = [];
		let limited = false;
		// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore query chains requires any
		const chain: any = {
			where: vi.fn((f: string, op: string, v: unknown) => {
				filters.push([f, op, v]);
				if (opts.dataCollections && name in opts.dataCollections)
					opts.dataCollections[name].push([f, op, v]);
				return chain;
			}),
			orderBy: vi.fn(() => chain),
			limit: vi.fn(() => {
				limited = true;
				return chain;
			}),
			doc: vi.fn((id?: string) => ({
				id: id ?? `${name}-new`,
				get: vi.fn().mockResolvedValue(
					name === COLLECTIONS.USERS
						? {
								exists: true,
								data: () => ({ role: ROLES.MANAGER, displayName: "Mona" }),
							}
						: name === COLLECTIONS.SHIFTS && id && opts.shiftById
							? { exists: true, data: () => opts.shiftById }
							: { exists: false, data: () => undefined },
				),
			})),
			get: vi.fn(async () => {
				const docs =
					name === COLLECTIONS.SHIFTS && opts.shifts
						? opts.shifts(filters, limited)
						: [];
				return { docs, empty: docs.length === 0 };
			}),
		};
		return chain;
	});
}

describe("M-133 shift days use shop time (TD-065)", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers({ toFake: ["Date"] });
		vi.setSystemTime(NOW);
		vi.mocked(auth.verifyIdToken).mockResolvedValue({
			uid: "mgr",
			email: "mgr@test.local",
		} as never);
	});
	afterEach(() => vi.useRealTimers());

	it("an in-progress shift opened at 00:30 shop time today is NOT relabelled MISSED", async () => {
		const open = doc("s1", {
			status: "OPEN",
			start_time: "2026-10-07T21:30:00.000Z",
		});
		wire({
			shifts: (f) =>
				f.some(([k, , v]) => k === "status" && v === "OPEN") ? [open] : [],
		});
		await request(app).get("/api/shifts").set("Authorization", authHeader);
		expect(open.ref.update).not.toHaveBeenCalled();
	});
	it("a shift left open from a previous shop day IS relabelled MISSED", async () => {
		const stale = doc("s2", {
			status: "OPEN",
			start_time: "2026-10-07T10:00:00.000Z",
		});
		wire({
			shifts: (f) =>
				f.some(([k, , v]) => k === "status" && v === "OPEN") ? [stale] : [],
		});
		await request(app).get("/api/shifts").set("Authorization", authHeader);
		expect(stale.ref.update).toHaveBeenCalledWith({ status: "MISSED" });
	});
	it("gap dates are shop calendar days between the last shift and today", async () => {
		wire({
			shifts: (_f, limited) => {
				if (limited)
					return [
						doc("last", {
							status: "CLOSED",
							start_time: "2026-10-05T10:00:00.000Z",
						}),
					];
				return [];
			},
		});
		const res = await request(app)
			.get("/api/shifts/missed")
			.set("Authorization", authHeader);
		expect(res.status).toBe(200);
		expect(res.body.gapDates).toEqual(["2026-10-06", "2026-10-07"]);
	});
	it("a shift closed at 01:00 shop time today still blocks a second auto-open today (409)", async () => {
		const closed = doc("c1", {
			status: "CLOSED",
			start_time: "2026-10-07T22:00:00.000Z",
		});
		wire({
			shifts: (f) =>
				f.some(([k, , v]) => k === "status" && v === "CLOSED") ? [closed] : [],
		});
		const res = await request(app)
			.post("/api/shifts/auto-open")
			.set("Authorization", authHeader)
			.send({ floatAmount: 0, managerName: "Mona" });
		expect(res.status).toBe(409);
		expect(res.body.error).toMatch(/already closed today/i);
	});
});

describe("M-133 closing a MISSED shift (TD-066)", () => {
	const DATA = [
		COLLECTIONS.GAME_SALES_LOGS,
		COLLECTIONS.KENO_LOGS,
		COLLECTIONS.CREDITS,
		COLLECTIONS.EXPENSES,
		COLLECTIONS.SPORTS_BETTING_LOGS,
	];
	const MISSED = {
		status: "MISSED",
		start_time: "2026-10-05T10:00:00.000Z",
		opening_float: 100,
		manager_name: "Mona",
	};
	const OPEN = {
		...MISSED,
		status: "OPEN",
		start_time: "2026-10-08T05:00:00.000Z",
	};
	let updates: Record<string, unknown>[] = [];
	let audits: Record<string, unknown>[] = [];

	function runClose(
		shift: Record<string, unknown>,
		recorded: Record<string, Filter[]>,
	) {
		wire({ shiftById: shift, dataCollections: recorded });
		updates = [];
		audits = [];
		vi.mocked(db.runTransaction).mockImplementation(async (cb: never) => {
			const tx = {
				get: vi.fn().mockResolvedValue({ exists: true, data: () => shift }),
				update: vi.fn((_r: unknown, v: Record<string, unknown>) =>
					updates.push(v),
				),
				set: vi.fn((_r: unknown, v: Record<string, unknown>) => audits.push(v)),
			};
			// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any
			return (cb as any)(tx);
		});
		return request(app)
			.post("/api/shifts/s1/close")
			.set("Authorization", authHeader)
			.send({ actualCashCounted: 100, shortageReason: "forgot to close" });
	}

	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers({ toFake: ["Date"] });
		vi.setSystemTime(NOW);
		vi.mocked(auth.verifyIdToken).mockResolvedValue({
			uid: "mgr",
			email: "mgr@test.local",
		} as never);
	});
	afterEach(() => vi.useRealTimers());

	it("bounds every total to the end of the missed shift's own shop day", async () => {
		const recorded = Object.fromEntries(DATA.map((n) => [n, [] as Filter[]]));
		const res = await runClose(MISSED, recorded);
		expect(res.status).toBe(200);
		for (const name of DATA) {
			expect(recorded[name]).toContainEqual(["date", ">=", MISSED.start_time]);
			expect(recorded[name]).toContainEqual([
				"date",
				"<=",
				"2026-10-05T20:59:59.999Z",
			]);
		}
	});
	it("records the end of that shop day as the shift end and closes it", async () => {
		const res = await runClose(
			MISSED,
			Object.fromEntries(DATA.map((n) => [n, [] as Filter[]])),
		);
		expect(res.status).toBe(200);
		expect(updates[0].status).toBe("CLOSED");
		expect(updates[0].end_time).toBe("2026-10-05T20:59:59.999Z");
		expect(String(audits[0].reason_for_change)).toMatch(/missed shift/i);
	});
	it("a normal OPEN shift is not bounded and ends now", async () => {
		const recorded = Object.fromEntries(DATA.map((n) => [n, [] as Filter[]]));
		const res = await runClose(OPEN, recorded);
		expect(res.status).toBe(200);
		for (const name of DATA)
			expect(recorded[name].some(([, op]) => op === "<=")).toBe(false);
		expect(updates[0].end_time).toBe(NOW.toISOString());
	});
	it("an already closed shift still cannot be closed again", async () => {
		const res = await runClose({ ...MISSED, status: "CLOSED" }, {});
		expect(res.status).toBe(400);
	});
});
