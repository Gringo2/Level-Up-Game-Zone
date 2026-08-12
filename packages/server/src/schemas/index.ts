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
	game_id: z.string().optional(),
	game_name: z.string().trim().min(1, "Game name is required"),
	quantity_sold: positiveNumber("Quantity sold"),
	rate_applied: positiveNumber("Rate applied"),
	calculated_total: nonNegativeNumber("Calculated total"),
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
export const CreateKenoSchema = z.object({
	sales: nonNegativeNumber("Sales"),
	payouts: nonNegativeNumber("Payouts"),
	net_profit: z.coerce.number(),
});

export const UpdateKenoSchema = z.object({
	sales: nonNegativeNumber("Sales").optional(),
	payouts: nonNegativeNumber("Payouts").optional(),
	net_profit: z.coerce.number().optional(),
	editReason: z
		.string()
		.trim()
		.min(3, "Reason for change must be at least 3 characters"),
});

// Expense Schemas
export const CreateExpenseSchema = z.object({
	description: z.string().trim().min(1, "Description is required"),
	amount: positiveNumber("Amount"),
	category: z.string().trim().optional().default("Misc"),
});

export const UpdateExpenseSchema = z.object({
	description: z.string().trim().min(1, "Description is required").optional(),
	amount: positiveNumber("Amount").optional(),
	category: z.string().trim().optional(),
	editReason: z
		.string()
		.trim()
		.min(3, "Reason for change must be at least 3 characters"),
});

// Credit Schemas
export const CreateCreditSchema = z.object({
	employee_name: z.string().trim().min(1, "Employee name is required"),
	amount: positiveNumber("Amount"),
	reason: z.string().optional(),
});

export const UpdateCreditSchema = z.object({
	employee_name: z
		.string()
		.trim()
		.min(1, "Employee name is required")
		.optional(),
	amount: positiveNumber("Amount").optional(),
	status: z.enum(["Pending", "Resolved", "Deducted"]).optional(),
	editReason: z.string().optional(),
});

// Game Rate Schemas
export const CreateGameRateSchema = z.object({
	game_name: z.string().trim().min(1, "Game name is required"),
	price_per_unit: positiveNumber("Price per unit"),
	unit_type: z.enum(["Hour", "Game"], {
		errorMap: () => ({ message: "Unit type must be 'Hour' or 'Game'" }),
	}),
	isActive: z.boolean().optional().default(true),
});

export const UpdateGameRateSchema = z.object({
	game_name: z.string().trim().min(1, "Game name is required").optional(),
	price_per_unit: positiveNumber("Price per unit").optional(),
	unit_type: z
		.enum(["Hour", "Game"], {
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
export const CreateUserSchema = z.object({
	role: z
		.enum(["admin", "manager", "staff"], {
			errorMap: () => ({
				message: "Role must be 'admin', 'manager', or 'staff'",
			}),
		})
		.optional()
		.default("staff"),
});

export const UpdateRoleSchema = z.object({
	role: z.enum(["admin", "manager", "staff"], {
		errorMap: () => ({
			message: "Role must be 'admin', 'manager', or 'staff'",
		}),
	}),
	editReason: z
		.string()
		.trim()
		.min(3, "Reason for change must be at least 3 characters"),
});
