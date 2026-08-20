export * from "./constants.js";

import type { ROLES } from "./constants.js";
export type Role = (typeof ROLES)[keyof typeof ROLES];

export interface AppUser {
	uid: string;
	email: string;
	displayName: string;
	role: Role;
}

export type BreakDay =
	| "Monday"
	| "Tuesday"
	| "Wednesday"
	| "Thursday"
	| "Friday"
	| "Saturday"
	| "Sunday"
	| null;

export interface Employee {
	id: string;
	name: string;
	position: string;
	base_salary: number;
	hired_date: string;
	break_day: BreakDay;
	isActive: boolean;
	created_at: string;
}

export interface GameRate {
	id: string;
	game_name: string;
	price_per_unit: number;
	unit_type: "Hour" | "Game";
	isActive: boolean;
}

export interface GameSalesLog {
	id: string;
	game_id: string;
	game_name: string;
	quantity_sold: number;
	rate_applied: number;
	calculated_total: number;
	user_id: string;
	user_name?: string;
	date: string;
}

export interface KenoLog {
	id: string;
	sales: number;
	payouts: number;
	net_profit: number;
	user_id: string;
	user_name?: string;
	date: string;
	verified?: boolean;
}

export interface Credit {
	id: string;
	employee_id?: string;
	employee_name: string;
	amount: number;
	status: "Pending" | "Resolved" | "Deducted";
	user_id: string;
	user_name?: string;
	date: string;
	resolved_date?: string;
}

export interface Expense {
	id: string;
	item_name: string;
	description: string;
	amount: number;
	category?: string;
	user_id: string;
	user_name?: string;
	date: string;
	verified?: boolean;
	quantity?: number;
	unit_price?: number;
	unit?: string;
}

export interface ExpenseCategory {
	id: string;
	name: string;
	isActive: boolean;
	created_at: string;
}

export interface Shift {
	id: string;
	manager_id: string;
	manager_name: string;
	start_time: string;
	end_time?: string;
	opening_float: number;
	actual_cash_counted?: number;
	expected_cash_calculated?: number;
	variance?: number;
	reason_for_shortage?: string;
	status: "OPEN" | "CLOSED" | "MISSED";
}

export interface AuditLog {
	id: string;
	table_affected: string;
	record_id: string;
	old_value: unknown;
	new_value: unknown;
	reason_for_change: string;
	user_id: string;
	timestamp: string;
}

export interface MissedDayResolution {
	id: string;
	date: string;
	status: "SHOP_CLOSED" | "DATA_FILLED";
	resolved_by_id: string;
	resolved_by_name: string;
	resolved_at: string;
	notes?: string;
	expected_cash_calculated?: number;
	actual_cash_counted?: number;
	variance?: number;
}
