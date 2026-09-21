import { endOfDay, format, startOfDay } from "date-fns";
import { toZonedTime } from "date-fns-tz";

export const SHOP_TIMEZONE = "Africa/Addis_Ababa";

export const getShopDate = (date: Date = new Date()) => {
	return toZonedTime(date, SHOP_TIMEZONE);
};

export const getShopDateString = (date: Date = new Date()) => {
	return format(getShopDate(date), "yyyy-MM-dd");
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
