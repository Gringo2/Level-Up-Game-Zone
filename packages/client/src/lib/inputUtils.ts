// Pure numeric input parser shared between Keno and SportsBetting pages.
// Uses full-string Number() semantics — mirroring the server's z.coerce +
// NaN-refine — so partial/garbage input ("1e-", "--1") is rejected outright.
// Exported at module level so it is unit-testable in isolation (jsdom
// sanitizes number inputs, making the guard unreachable through change events
// in tests).
export const parseNetAmountInput = (raw: string): number | null => {
	const trimmed = raw.trim();
	if (trimmed === "") return null;
	const parsed = Number(trimmed);
	return Number.isFinite(parsed) ? parsed : null;
};
