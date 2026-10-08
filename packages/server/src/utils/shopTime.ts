import { SHOP_TIMEZONE, SHOP_UTC_OFFSET } from "@level-up/shared";

// M-133 / ACP-041: all business-day logic on the server uses shop time
// (Africa/Addis_Ababa), never the host timezone.
const shopDateFormat = new Intl.DateTimeFormat("en-CA", {
	timeZone: SHOP_TIMEZONE,
	year: "numeric",
	month: "2-digit",
	day: "2-digit",
});

/** Shop calendar date (YYYY-MM-DD) of an instant. */
export const shopDateString = (date: Date): string =>
	shopDateFormat.format(date);

/** Add whole days to a shop calendar date (YYYY-MM-DD). */
export const addDaysToShopDate = (ymd: string, days: number): string => {
	const [year, month, day] = ymd.split("-").map(Number);
	return new Date(Date.UTC(year, month - 1, day + days))
		.toISOString()
		.slice(0, 10);
};

/** Last instant (23:59:59.999 shop time) of a shop calendar date. */
export const shopDayEnd = (ymd: string): Date =>
	new Date(`${ymd}T23:59:59.999${SHOP_UTC_OFFSET}`);

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * TD-063: the entry forms send the chosen business day as midnight UTC. For a
 * day that is "today" in shop time, store the current instant so the entry
 * falls inside the running shift window. Backdated or future days and values
 * that already carry a time of day are stored unchanged.
 */
export const resolveEntryDate = (
	input: string | undefined,
	now: Date = new Date(),
): string => {
	if (!input) return now.toISOString();
	const parsed = new Date(input);
	if (Number.isNaN(parsed.getTime())) {
		throw new RangeError("Invalid date");
	}
	const iso = parsed.toISOString();
	const isDayOnly = DATE_ONLY.test(input) || iso.endsWith("T00:00:00.000Z");
	if (isDayOnly && iso.slice(0, 10) === shopDateString(now)) {
		return now.toISOString();
	}
	return iso;
};
