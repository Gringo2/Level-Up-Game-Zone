import type { Shift } from "@level-up/shared";
import { useState } from "react";
import { toast } from "sonner";
import { API_BASE, authFetch, safeJson } from "../lib/api";
import { formatSafeDate } from "../lib/dateUtils";
import { Button } from "./ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

// M-133 / TD-066: a shift left open past its shop day becomes MISSED. Closing
// it here records the cash that was counted and why it was closed late.
function MissedShiftRow({
	shift,
	onResolved,
}: {
	shift: Shift;
	onResolved: () => Promise<void>;
}) {
	const [cash, setCash] = useState("");
	const [reason, setReason] = useState("");
	const [submitting, setSubmitting] = useState(false);

	const handleClose = async (e: React.FormEvent) => {
		e.preventDefault();
		const counted = parseFloat(cash);
		if (!cash || Number.isNaN(counted) || counted < 0) {
			toast.error("Enter the cash that was counted for this shift.");
			return;
		}
		if (!reason.trim()) {
			toast.error("Please provide a reason.");
			return;
		}
		setSubmitting(true);
		try {
			const response = await authFetch(
				`${API_BASE}/api/shifts/${shift.id}/close`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						actualCashCounted: counted,
						shortageReason: reason.trim(),
					}),
				},
			);
			const data = await safeJson(response);
			if (!response.ok) {
				throw new Error(data.error || "Failed to close missed shift");
			}
			toast.success("Missed shift closed.");
			await onResolved();
		} catch (err) {
			toast.error(
				err instanceof Error ? err.message : "Failed to close missed shift",
			);
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<form
			onSubmit={handleClose}
			className="space-y-3 rounded-md border border-amber-200 bg-white p-4"
		>
			<div className="text-sm font-medium">
				{shift.manager_name} · opened{" "}
				{formatSafeDate(shift.start_time, "EEE, MMM d, yyyy h:mm a")}
			</div>
			<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
				<div className="space-y-1">
					<Label htmlFor={`missed-cash-${shift.id}`}>Cash counted ($)</Label>
					<Input
						id={`missed-cash-${shift.id}`}
						type="number"
						step="0.01"
						min="0"
						value={cash}
						onChange={(e) => setCash(e.target.value)}
					/>
				</div>
				<div className="space-y-1">
					<Label htmlFor={`missed-reason-${shift.id}`}>Reason (required)</Label>
					<Input
						id={`missed-reason-${shift.id}`}
						value={reason}
						onChange={(e) => setReason(e.target.value)}
						placeholder="e.g., Forgot to close on Sunday"
					/>
				</div>
			</div>
			<Button type="submit" size="sm" disabled={submitting}>
				{submitting ? "Closing..." : "Close missed shift"}
			</Button>
		</form>
	);
}

export function MissedShiftsCard({
	shifts,
	onResolved,
}: {
	shifts: Shift[];
	onResolved: () => Promise<void>;
}) {
	if (shifts.length === 0) return null;
	return (
		<Card
			data-testid="missed-shifts-card"
			className="border-amber-300 bg-amber-50"
		>
			<CardHeader>
				<CardTitle>Missed shifts need closing</CardTitle>
				<CardDescription>
					These shifts were left open past their day. Enter the cash that was
					counted and why they were closed late. Totals stop at the end of the
					shift's own day.
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-3">
				{shifts.map((shift) => (
					<MissedShiftRow
						key={shift.id}
						shift={shift}
						onResolved={onResolved}
					/>
				))}
			</CardContent>
		</Card>
	);
}
