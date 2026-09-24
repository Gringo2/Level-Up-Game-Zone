import { describe, expect, it, vi } from "vitest";
import {
	formatSafeDate,
	getShopDate,
	getShopDateString,
	getShopEndOfDay,
	getShopLastMonthRange,
	getShopLastWeekRange,
	getShopStartOfDay,
	getShopThisMonthRange,
	getShopThisWeekRange,
	getShopYesterdayString,
	shopDateToInstant,
} from "../../lib/dateUtils.js";

// Africa/Addis_Ababa is fixed UTC+3 with no DST.
// date-fns-tz v3 `toZonedTime` returns a TZDate whose wall-clock getters
// report Addis time while the underlying instant is unchanged, so:
// - Addis wall-clock 2026-01-01T00:00 == instant 2025-12-31T21:00:00.000Z
// - Addis wall-clock 2026-01-01T23:59:59.999 == instant 2026-01-01T20:59:59.999Z
describe("dateUtils (Africa/Addis_Ababa)", () => {
	it("maps a UTC instant to the Addis wall-clock time", () => {
		const zoned = getShopDate(new Date("2026-01-01T10:00:00.000Z"));
		expect(zoned.getHours()).toBe(13);
		expect(zoned.getTimezoneOffset()).toBe(-180);
	});

	it("computes the start of the shop day in Addis time", () => {
		// 10:00 UTC == 13:00 local; Addis midnight on Jan 1 is 21:00 UTC Dec 31.
		const start = getShopStartOfDay(new Date("2026-01-01T10:00:00.000Z"));
		expect(start.toISOString()).toBe("2025-12-31T21:00:00.000Z");
	});

	it("computes the end of the shop day in Addis time", () => {
		const end = getShopEndOfDay(new Date("2026-01-01T10:00:00.000Z"));
		expect(end.toISOString()).toBe("2026-01-01T20:59:59.999Z");
	});

	it("defaults to the current time in Addis time when no date is supplied", () => {
		const before = Date.now();
		const zoned = getShopDate();
		const after = Date.now();
		expect(zoned.getTimezoneOffset()).toBe(-180);
		expect(zoned.getTime()).toBeGreaterThanOrEqual(before);
		expect(zoned.getTime()).toBeLessThanOrEqual(after);
	});

	it("formats the current shop date in Addis time rather than UTC", () => {
		vi.setSystemTime(new Date("2026-01-01T21:00:00.000Z"));
		expect(getShopDateString()).toBe("2026-01-02");
		vi.useRealTimers();
	});

	it("formats yesterday shop date in Addis time rather than UTC", () => {
		vi.setSystemTime(new Date("2026-01-01T21:00:00.000Z"));
		expect(getShopYesterdayString()).toBe("2026-01-01");
		vi.useRealTimers();
	});

	it("converts a shop date string to the correct Addis-midnight instant", () => {
		expect(shopDateToInstant("2026-01-02").toISOString()).toBe(
			"2026-01-01T21:00:00.000Z",
		);
	});

	it("formats valid date string and Date instances safely", () => {
		expect(formatSafeDate("2026-09-22T08:00:00.000Z", "yyyy-MM-dd")).toBe(
			"2026-09-22",
		);
		expect(
			formatSafeDate(new Date("2026-09-22T08:00:00.000Z"), "yyyy-MM-dd"),
		).toBe("2026-09-22");
	});

	it("returns fallback for invalid, null, or undefined dates without throwing", () => {
		expect(formatSafeDate(null, "yyyy-MM-dd")).toBe("—");
		expect(formatSafeDate(undefined, "yyyy-MM-dd")).toBe("—");
		expect(formatSafeDate("not-a-date", "yyyy-MM-dd")).toBe("—");
		expect(formatSafeDate("", "yyyy-MM-dd", "N/A")).toBe("N/A");
	});

	it("computes This Week range (Monday to Sunday) in shop timezone", () => {
		const fixedDate = new Date("2026-09-24T12:00:00.000Z"); // Thursday
		const range = getShopThisWeekRange(fixedDate);
		expect(range).toEqual({ from: "2026-09-21", to: "2026-09-27" });
	});

	it("computes Last Week range (previous Monday to Sunday) in shop timezone", () => {
		const fixedDate = new Date("2026-09-24T12:00:00.000Z"); // Thursday
		const range = getShopLastWeekRange(fixedDate);
		expect(range).toEqual({ from: "2026-09-14", to: "2026-09-20" });
	});

	it("computes This Month range (first to last day) in shop timezone", () => {
		const fixedDate = new Date("2026-09-24T12:00:00.000Z");
		const range = getShopThisMonthRange(fixedDate);
		expect(range).toEqual({ from: "2026-09-01", to: "2026-09-30" });
	});

	it("computes Last Month range in shop timezone, handling year rollover", () => {
		const fixedDate = new Date("2026-09-24T12:00:00.000Z");
		expect(getShopLastMonthRange(fixedDate)).toEqual({
			from: "2026-08-01",
			to: "2026-08-31",
		});

		// Year rollover: January 2026 -> December 2025
		const janDate = new Date("2026-01-15T12:00:00.000Z");
		expect(getShopLastMonthRange(janDate)).toEqual({
			from: "2025-12-01",
			to: "2025-12-31",
		});
	});
});
