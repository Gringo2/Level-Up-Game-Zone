import { describe, expect, it } from "vitest";
import {
	getShopDate,
	getShopEndOfDay,
	getShopStartOfDay,
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
});
