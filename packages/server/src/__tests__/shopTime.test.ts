import { describe, expect, it } from "vitest";
import {
	addDaysToShopDate,
	resolveEntryDate,
	shopDateString,
	shopDayEnd,
} from "../utils/shopTime.js";

// M-133 / ACP-041: shop time is Africa/Addis_Ababa (UTC+3, no DST), never the host timezone.
// Every test passes `now` explicitly (ACP-007: no wall-clock dependence).
const NOW = new Date("2026-10-08T19:47:00.000Z"); // 22:47 on Oct 8 in shop time

describe("shopDateString", () => {
	it("returns the shop calendar date regardless of host timezone", () => {
		expect(shopDateString(new Date("2026-10-08T20:59:59.999Z"))).toBe(
			"2026-10-08",
		);
		expect(shopDateString(new Date("2026-10-08T21:00:00.000Z"))).toBe(
			"2026-10-09",
		);
		expect(shopDateString(new Date("2026-09-30T21:30:00.000Z"))).toBe(
			"2026-10-01",
		);
	});
});

describe("addDaysToShopDate / shopDayEnd", () => {
	it("rolls over month and year boundaries", () => {
		expect(addDaysToShopDate("2026-09-30", 1)).toBe("2026-10-01");
		expect(addDaysToShopDate("2026-10-01", -1)).toBe("2026-09-30");
		expect(addDaysToShopDate("2026-12-31", 1)).toBe("2027-01-01");
	});
	it("ends the shop day at 23:59:59.999 shop time", () => {
		expect(shopDayEnd("2026-10-08").toISOString()).toBe(
			"2026-10-08T20:59:59.999Z",
		);
	});
});

describe("resolveEntryDate (TD-063)", () => {
	it("uses the current instant when no date is sent", () => {
		expect(resolveEntryDate(undefined, NOW)).toBe(NOW.toISOString());
	});
	it("stamps the form's midnight-UTC value for shop-today with the current instant", () => {
		expect(resolveEntryDate("2026-10-08T00:00:00.000Z", NOW)).toBe(
			NOW.toISOString(),
		);
	});
	it("also treats a date-only string for shop-today as today", () => {
		expect(resolveEntryDate("2026-10-08", NOW)).toBe(NOW.toISOString());
	});
	it("keeps backdated entries on their chosen day (midnight UTC)", () => {
		expect(resolveEntryDate("2026-10-07T00:00:00.000Z", NOW)).toBe(
			"2026-10-07T00:00:00.000Z",
		);
		expect(resolveEntryDate("2026-09-30", NOW)).toBe(
			"2026-09-30T00:00:00.000Z",
		);
	});
	it("keeps future-dated entries unchanged", () => {
		expect(resolveEntryDate("2026-10-09T00:00:00.000Z", NOW)).toBe(
			"2026-10-09T00:00:00.000Z",
		);
	});
	it("never alters an entry that already carries a time of day", () => {
		expect(resolveEntryDate("2026-10-08T05:00:00.000Z", NOW)).toBe(
			"2026-10-08T05:00:00.000Z",
		);
	});
	it("decides 'today' in shop time, not UTC, near the day boundary", () => {
		const lateNow = new Date("2026-10-08T21:30:00.000Z"); // already Oct 9 in shop time
		expect(resolveEntryDate("2026-10-08T00:00:00.000Z", lateNow)).toBe(
			"2026-10-08T00:00:00.000Z",
		);
		expect(resolveEntryDate("2026-10-09T00:00:00.000Z", lateNow)).toBe(
			lateNow.toISOString(),
		);
	});
	it("rejects an invalid date", () => {
		expect(() => resolveEntryDate("garbage", NOW)).toThrow();
	});
});
