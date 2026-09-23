import { endOfDay, format, isValid, startOfDay, subDays } from "date-fns";
import { toZonedTime } from "date-fns-tz";

export const SHOP_TIMEZONE = "Africa/Addis_Ababa";

export const getShopDate = (date: Date = new Date()) => {
	return toZonedTime(date, SHOP_TIMEZONE);
};

export const getShopDateString = (date: Date = new Date()) => {
	return format(getShopDate(date), "yyyy-MM-dd");
};

export const getShopYesterdayString = (date: Date = new Date()): string => {
	return format(subDays(getShopDate(date), 1), "yyyy-MM-dd");
};

export const shopDateToInstant = (shopDate: string) => {
	return new Date(`${shopDate}T00:00:00+03:00`);
};

export const getShopStartOfDay = (date: Date = new Date()) => {
	return startOfDay(getShopDate(date));
};

export const getShopEndOfDay = (date: Date = new Date()) => {
	return endOfDay(getShopDate(date));
};

export const formatSafeDate = (
	date: unknown,
	formatStr: string,
	fallback = "—",
): string => {
	if (!date) return fallback;
	const d = date instanceof Date ? date : new Date(date as string | number);
	if (!isValid(d) || Number.isNaN(d.getTime())) {
		return fallback;
	}
	return format(d, formatStr);
};
