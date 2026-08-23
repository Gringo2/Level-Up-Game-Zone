// ── Roles ────────────────────────────────────────────────────────────────────
export const ROLES = {
	ADMIN: "admin",
	MANAGER: "manager",
	STAFF: "staff",
} as const;

// ── Credit Statuses ──────────────────────────────────────────────────────────
export const CREDIT_STATUSES = {
	PENDING: "Pending",
	RESOLVED: "Resolved",
	DEDUCTED: "Deducted",
} as const;

// ── Shift Statuses ───────────────────────────────────────────────────────────
export const SHIFT_STATUSES = {
	OPEN: "OPEN",
	CLOSED: "CLOSED",
	MISSED: "MISSED",
} as const;

// ── Game Rate Unit Types ─────────────────────────────────────────────────────
export const UNIT_TYPES = {
	HOUR: "Hour",
	GAME: "Game",
} as const;

// ── Missed Day Resolution Statuses ───────────────────────────────────────────
export const RESOLUTION_STATUSES = {
	SHOP_CLOSED: "SHOP_CLOSED",
	DATA_FILLED: "DATA_FILLED",
} as const;

// ── Expense Defaults ─────────────────────────────────────────────────────────
export const DEFAULT_EXPENSE_CATEGORY = "Misc" as const;

export const EXPENSE_CATEGORY_FALLBACKS = [
	"Maintenance",
	"Utilities",
	"Supplies",
	"Wages",
	"Misc",
] as const;

// ── Firestore Collection Names ───────────────────────────────────────────────
export const COLLECTIONS = {
	USERS: "users",
	USER_INVITES: "user_invites",
	EXPENSES: "expenses",
	EXPENSE_CATEGORIES: "expense_categories",
	AUDIT_LOGS: "audit_logs",
	KENO_LOGS: "keno_logs",
	GAME_SALES_LOGS: "game_sales_logs",
	CREDITS: "credits",
	EMPLOYEES: "employees",
	GAME_RATES: "game_rates",
	SHIFTS: "shifts",
	MISSED_DAY_RESOLUTIONS: "missed_day_resolutions",
} as const;

// ── Root Admin Emails (override via env: ROOT_ADMIN_EMAILS — server-side only;
// guard required because this module is also bundled for the browser, where
// `process` is undefined) ────────────────────────────────────────────────────
export const ROOT_ADMIN_EMAILS: string[] = (() => {
	const env =
		typeof process !== "undefined" ? process.env.ROOT_ADMIN_EMAILS : undefined;
	if (env) {
		return env.split(",").map((e) => e.trim().toLowerCase());
	}
	return ["bezueyob3@gmail.com", "jobsbezu@gmail.com"];
})();

// ── Server Constants ─────────────────────────────────────────────────────────
export const VARIANCE_THRESHOLD_FOR_EXPLANATION = 2;

export const SYSTEM_IDENTITY = {
	USER_ID: "system",
	DISPLAY_NAME: "System Auto-Open",
} as const;

// ── Default Game Rates (seeded client-side when no rates exist) ──────────────
export const DEFAULT_GAME_RATES = [
	{ game_name: "PS4", price_per_unit: 5, unit_type: UNIT_TYPES.HOUR },
	{ game_name: "Pool", price_per_unit: 2, unit_type: UNIT_TYPES.GAME },
] as const;
