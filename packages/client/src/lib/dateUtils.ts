import {
	endOfDay,
	endOfMonth,
	endOfWeek,
	format,
	isValid,
	startOfDay,
	startOfMonth,
	startOfWeek,
	subDays,
	subMonths,
	subWeeks,
} from "date-fns";
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

export const getShopThisWeekRange = (
	date: Date = new Date(),
): { from: string; to: string } => {
	const shopDate = getShopDate(date);
	return {
		from: format(startOfWeek(shopDate, { weekStartsOn: 1 }), "yyyy-MM-dd"),
		to: format(endOfWeek(shopDate, { weekStartsOn: 1 }), "yyyy-MM-dd"),
	};
};

export const getShopLastWeekRange = (
	date: Date = new Date(),
): { from: string; to: string } => {
	const shopDate = getShopDate(date);
	const prevWeek = subWeeks(shopDate, 1);
	return {
		from: format(startOfWeek(prevWeek, { weekStartsOn: 1 }), "yyyy-MM-dd"),
		to: format(endOfWeek(prevWeek, { weekStartsOn: 1 }), "yyyy-MM-dd"),
	};
};

export const getShopThisMonthRange = (
	date: Date = new Date(),
): { from: string; to: string } => {
	const shopDate = getShopDate(date);
	return {
		from: format(startOfMonth(shopDate), "yyyy-MM-dd"),
		to: format(endOfMonth(shopDate), "yyyy-MM-dd"),
	};
};

export const getShopLastMonthRange = (
	date: Date = new Date(),
): { from: string; to: string } => {
	const shopDate = getShopDate(date);
	const prevMonth = subMonths(shopDate, 1);
	return {
		from: format(startOfMonth(prevMonth), "yyyy-MM-dd"),
		to: format(endOfMonth(prevMonth), "yyyy-MM-dd"),
	};
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
