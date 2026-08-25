import {
	CREDIT_STATUSES,
	DEFAULT_EXPENSE_CATEGORY,
	ROLES,
	UNIT_TYPES,
} from "@level-up/shared";
import { z } from "zod";

// Helper for numeric coercion that rejects NaN and negative values
const nonNegativeNumber = (fieldName: string) =>
	z.coerce
		.number({ invalid_type_error: `${fieldName} must be a valid number` })
		.refine((val) => !Number.isNaN(val), {
			message: `${fieldName} cannot be NaN`,
		})
		.refine((val) => val >= 0, {
			message: `${fieldName} cannot be negative`,
		});

const positiveNumber = (fieldName: string) =>
	z.coerce
		.number({ invalid_type_error: `${fieldName} must be a valid number` })
		.refine((val) => !Number.isNaN(val), {
			message: `${fieldName} cannot be NaN`,
		})
		.refine((val) => val > 0, {
			message: `${fieldName} must be greater than 0`,
		});

// Numeric field that may be negative, but rejects null/"" (JSON.stringify(NaN) hole)
// and non-numeric strings. Negatives stay legal for fields like keno net_profit.
const finiteNumber = (fieldName: string) =>
	z.preprocess(
		(value) => (value === null || value === "" ? Number.NaN : value),
		z.coerce
			.number({ invalid_type_error: `${fieldName} must be a valid number` })
			.refine((val) => Number.isFinite(val), {
				message: `${fieldName} must be a valid number`,
			}),
	);

export const DeleteReasonSchema = z.object({
	deleteReason: z
		.string()
		.trim()
		.min(3, "Reason for deletion must be at least 3 characters"),
});

// Shift Schemas
export const StartShiftSchema = z.object({
	floatAmount: nonNegativeNumber("Opening float"),
	managerName: z.string().trim().min(1, "Manager name is required"),
});

export const CloseShiftSchema = z.object({
	actualCashCounted: nonNegativeNumber("Actual cash counted"),
	shortageReason: z.string().optional(),
});

// Game Sales Schemas
export const CreateSaleSchema = z.object({
	game_id: z
		.string({ required_error: "Game selection is required" })
		.min(1, "Game selection is required"),
	game_name: z.string().trim().min(1, "Game name is required"),
	quantity_sold: positiveNumber("Quantity sold"),
	rate_applied: positiveNumber("Rate applied"),
	date: z.string().optional(),
});

export const UpdateSaleSchema = z
	.object({
		game_id: z.string().optional(),
		game_name: z.string().trim().min(1, "Game name is required").optional(),
		quantity_sold: positiveNumber("Quantity sold").optional(),
		rate_applied: positiveNumber("Rate applied").optional(),
		calculated_total: nonNegativeNumber("Calculated total").optional(),
		editReason: z
			.string()
			.trim()
			.min(3, "Reason for change must be at least 3 characters"),
	})
	.strip();

// Keno Schemas
const KENO_RETIRED_KEYS: readonly string[] = ["sales", "payouts"];

const rejectRetiredAndUnknownKeys = <T extends z.ZodRawShape>(shape: T) =>
	z
		.object(shape)
		.passthrough()
		.superRefine((value, ctx) => {
			const allowed = Object.keys(shape);
			const unknown = Object.keys(value).filter(
				(key) => !allowed.includes(key),
			);
			if (unknown.length === 0) return;
			const retired = unknown.filter((key) => KENO_RETIRED_KEYS.includes(key));
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: retired.length
					? `Retired field(s): ${retired.join(", ")}. Keno entries accept a direct net amount only — resend using net_profit without ${retired.join(", ")}.`
					: `Unrecognized key(s) in object: ${unknown.join(", ")}`,
			});
		});

export const CreateKenoSchema = rejectRetiredAndUnknownKeys({
	net_profit: finiteNumber("Net profit"),
	date: z.string().optional(),
});

export const UpdateKenoSchema = rejectRetiredAndUnknownKeys({
	net_profit: finiteNumber("Net profit").optional(),
	editReason: z
		.string()
		.trim()
		.min(3, "Reason for change must be at least 3 characters"),
});

export const DateRangeQuerySchema = z.object({
	startDate: z.string().optional(),
	endDate: z.string().optional(),
	// TD-032: opt-in cursor pagination. Absent -> legacy bare-array response.
	limit: z.coerce.number().int().min(1).max(200).optional(),
	cursor: z.string().optional(),
});

export const CreditsQuerySchema = DateRangeQuerySchema.extend({
	employee_id: z.string().optional(),
});

export const CreateExpenseSchema = z
	.object({
		item_name: z.string().trim().min(1, "Item name is required"),
		description: z.string().trim().min(1, "Description is required"),
		amount: positiveNumber("Amount").optional(),
		category: z.string().trim().optional().default(DEFAULT_EXPENSE_CATEGORY),
		date: z.string().optional(),
		quantity: z.coerce
			.number()
			.positive("Quantity must be greater than 0")
			.optional(),
		unit_price: positiveNumber("Unit price").optional(),
		unit: z.string().trim().optional(),
	})
	.superRefine((data, ctx) => {
		const hasQuantity = data.quantity !== undefined;
		const hasUnitPrice = data.unit_price !== undefined;
		const hasAmount = data.amount !== undefined;

		if (!hasAmount && !hasQuantity && !hasUnitPrice) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: "Either amount or quantity + unit_price is required",
				path: ["amount"],
			});
		}
		if (hasQuantity !== hasUnitPrice) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: "quantity and unit_price must both be provided",
				path: hasQuantity ? ["unit_price"] : ["quantity"],
			});
		}
	});

export const UpdateExpenseSchema = z.object({
	item_name: z.string().trim().min(1, "Item name is required").optional(),
	description: z.string().trim().min(1, "Description is required").optional(),
	amount: positiveNumber("Amount").optional(),
	category: z.string().trim().optional(),
	editReason: z
		.string()
		.trim()
		.min(3, "Reason for change must be at least 3 characters"),
	quantity: z.coerce
		.number()
		.positive("Quantity must be greater than 0")
		.optional(),
	unit_price: positiveNumber("Unit price").optional(),
	unit: z.string().trim().optional(),
});

// Credit Schemas
export const CreateCreditSchema = z.object({
	employee_id: z.string().trim().min(1, "Employee ID is required"),
	employee_name: z.string().trim().min(1, "Employee name is required"),
	amount: positiveNumber("Amount"),
	reason: z.string().optional(),
	date: z.string().optional(),
});

export const UpdateCreditSchema = z.object({
	employee_id: z.string().trim().min(1, "Employee ID is required").optional(),
	employee_name: z
		.string()
		.trim()
		.min(1, "Employee name is required")
		.optional(),
	amount: positiveNumber("Amount").optional(),
	reason: z.string().optional(),
	status: z
		.enum([
			CREDIT_STATUSES.PENDING,
			CREDIT_STATUSES.RESOLVED,
			CREDIT_STATUSES.DEDUCTED,
		])
		.optional(),
	editReason: z
		.string()
		.trim()
		.min(3, "Reason for change must be at least 3 characters"),
});

// Expense Category Schemas
export const CreateExpenseCategorySchema = z.object({
	name: z.string().trim().min(1, "Category name is required"),
});

export const UpdateExpenseCategorySchema = z.object({
	name: z.string().trim().min(1, "Category name is required").optional(),
	isActive: z.boolean().optional(),
	editReason: z
		.string()
		.trim()
		.min(3, "Reason for change must be at least 3 characters"),
});

// Game Rate Schemas
export const CreateGameRateSchema = z.object({
	game_name: z.string().trim().min(1, "Game name is required"),
	price_per_unit: positiveNumber("Price per unit"),
	unit_type: z.enum([UNIT_TYPES.HOUR, UNIT_TYPES.GAME], {
		errorMap: () => ({ message: "Unit type must be 'Hour' or 'Game'" }),
	}),
	isActive: z.boolean().optional().default(true),
});

export const UpdateGameRateSchema = z.object({
	game_name: z.string().trim().min(1, "Game name is required").optional(),
	price_per_unit: positiveNumber("Price per unit").optional(),
	unit_type: z
		.enum([UNIT_TYPES.HOUR, UNIT_TYPES.GAME], {
			errorMap: () => ({ message: "Unit type must be 'Hour' or 'Game'" }),
		})
		.optional(),
	isActive: z.boolean().optional(),
	editReason: z
		.string()
		.trim()
		.min(3, "Reason for change must be at least 3 characters"),
});

// User Schemas
export const InviteUserSchema = z.object({
	email: z.string().email("Invalid email address").toLowerCase(),
	role: z.enum([ROLES.ADMIN, ROLES.MANAGER, ROLES.STAFF], {
		errorMap: () => ({
			message: "Role must be 'admin', 'manager', or 'staff'",
		}),
	}),
});

export const CreateUserSchema = z.object({});

export const UpdateRoleSchema = z.object({
	role: z.enum([ROLES.ADMIN, ROLES.MANAGER, ROLES.STAFF], {
		errorMap: () => ({
			message: "Role must be 'admin', 'manager', or 'staff'",
		}),
	}),
	editReason: z
		.string()
		.trim()
		.min(3, "Reason for change must be at least 3 characters"),
});

// Employee Schemas
export const CreateEmployeeSchema = z.object({
	name: z.string().trim().min(1, "Employee name is required"),
	position: z.string().trim().min(1, "Position is required"),
	base_salary: nonNegativeNumber("Base salary"),
	hired_date: z.string().min(1, "Hired date is required"),
	break_day: z
		.enum([
			"Monday",
			"Tuesday",
			"Wednesday",
			"Thursday",
			"Friday",
			"Saturday",
			"Sunday",
		])
		.nullable()
		.optional()
		.default(null),
});

export const UpdateEmployeeSchema = z.object({
	name: z.string().trim().min(1, "Employee name is required").optional(),
	position: z.string().trim().min(1, "Position is required").optional(),
	base_salary: nonNegativeNumber("Base salary").optional(),
	hired_date: z.string().optional(),
	break_day: z
		.enum([
			"Monday",
			"Tuesday",
			"Wednesday",
			"Thursday",
			"Friday",
			"Saturday",
			"Sunday",
		])
		.nullable()
		.optional(),
	isActive: z.boolean().optional(),
	editReason: z
		.string()
		.trim()
		.min(3, "Reason for change must be at least 3 characters"),
});

// Update Float Schema
export const UpdateFloatSchema = z.object({
	floatAmount: nonNegativeNumber("Float amount"),
});
