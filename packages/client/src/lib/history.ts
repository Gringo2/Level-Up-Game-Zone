import { format } from "date-fns";

export const HISTORY_PAGE_SIZE = 5;

interface DayGroup {
	key: string;
	label: string;
	count: number;
	net: number;
}

// Pure so day-bucketing (weekday label, per-day count/net) is unit-testable.
// Preserves incoming order (server returns newest-first). The caller supplies
// the monetary accessor so one helper serves KenoLog and GameSalesLog alike.
export function groupLogsByDay<T extends { date: string }>(
	logs: T[],
	getValue: (log: T) => number,
): DayGroup[] {
	const groups = new Map<string, DayGroup>();
	for (const log of logs) {
		const d = new Date(log.date);
		const key = format(d, "yyyy-MM-dd");
		const existing = groups.get(key);
		if (existing) {
			existing.count += 1;
			existing.net += getValue(log);
		} else {
			groups.set(key, {
				key,
				label: format(d, "EEE, MMM d"),
				count: 1,
				net: getValue(log),
			});
		}
	}
	return Array.from(groups.values());
}

export function historyPageBounds(total: number): {
	pageCount: number;
	clamp: (page: number) => number;
	slice: (page: number) => [number, number];
} {
	const pageCount = Math.max(1, Math.ceil(total / HISTORY_PAGE_SIZE));
	return {
		pageCount,
		clamp: (page) => Math.min(page, pageCount - 1),
		slice: (page) => [page * HISTORY_PAGE_SIZE, (page + 1) * HISTORY_PAGE_SIZE],
	};
}
