/**
 * Messages intentionally surfaced to clients by controller business rules
 * (sentinel throws). Anything else collapses to a generic response so
 * Firestore/internal error details never leave the process.
 */
const SAFE_ERROR_MESSAGES: ReadonlySet<string> = new Set([
	"Keno log not found",
	"Expense not found",
	"Expense category not found",
	"Shift not found",
	"Shift data empty",
	"Shift is already closed",
	"Only open shifts can have their float updated",
	"Variance is greater than $2.00. Please provide a reason for the shortage.",
	"Sale not found",
	"Credit not found",
	"User or invitation not found",
	"User not found",
	"User already invited",
	"User already exists",
	"Root admin accounts cannot be deleted",
	"Rate not found",
	"Employee not found",
]);

export function safeErrorMessage(error: unknown): string {
	if (error instanceof Error && SAFE_ERROR_MESSAGES.has(error.message)) {
		return error.message;
	}
	return "Internal server error";
}
