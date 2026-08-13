import type React from "react";
import { useState } from "react";
import { toast } from "sonner";
import { useShift } from "../contexts/ShiftContext";
import { auth } from "../firebase";
import { API_BASE, safeJson } from "../lib/api";
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

export function MissedDataBlocker() {
	const { missedData, refetchShift } = useShift();
	const [resolving, setResolving] = useState(false);

	const [status, setStatus] = useState<"SHOP_CLOSED" | "DATA_FILLED">(
		"SHOP_CLOSED",
	);
	const [notes, setNotes] = useState("");
	const [expectedCash, setExpectedCash] = useState("");
	const [actualCash, setActualCash] = useState("");

	if (!missedData) return null;

	// Pick the first item to resolve: either a missed shift or a gap date
	const currentStaleShift = missedData.missedShifts[0];
	const currentGapDate = missedData.gapDates[0];

	if (!currentStaleShift && !currentGapDate) return null;

	const handleResolve = async (e: React.FormEvent) => {
		e.preventDefault();
		if (status === "DATA_FILLED" && (!expectedCash || !actualCash)) {
			toast.error("Please fill in cash amounts.");
			return;
		}

		setResolving(true);
		try {
			const token = await auth.currentUser?.getIdToken();
			if (!token) throw new Error("Not authenticated");

			const payload = {
				date: currentStaleShift
					? new Date(currentStaleShift.start_time).toLocaleDateString("en-CA")
					: currentGapDate,
				status,
				notes,
				expected_cash_calculated:
					status === "DATA_FILLED" ? parseFloat(expectedCash) : undefined,
				actual_cash_counted:
					status === "DATA_FILLED" ? parseFloat(actualCash) : undefined,
				shift_id: currentStaleShift ? currentStaleShift.id : undefined,
			};

			const response = await fetch(`${API_BASE}/api/shifts/resolve-missed`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify(payload),
			});

			if (!response.ok) {
				const err = await safeJson(response);
				throw new Error(err.error || "Failed to resolve missed data");
			}

			toast.success("Resolved missed data successfully.");
			setExpectedCash("");
			setActualCash("");
			setNotes("");
			setStatus("SHOP_CLOSED");
			await refetchShift();
		} catch (error: unknown) {
			console.error(error);
			toast.error(
				error instanceof Error ? error.message : "Failed to resolve.",
			);
		} finally {
			setResolving(false);
		}
	};

	return (
		<div className="absolute inset-0 z-[60] bg-zinc-900/95 flex flex-col items-center justify-center p-4 backdrop-blur-sm">
			<Card className="max-w-lg w-full border-red-500 shadow-red-500/20 shadow-2xl">
				<CardHeader>
					<CardTitle className="text-red-500 text-xl text-center">
						Missing Data Detected
					</CardTitle>
					<CardDescription className="text-center text-zinc-300">
						You must resolve past gaps before continuing operations.
					</CardDescription>
				</CardHeader>
				<CardContent>
					{currentStaleShift ? (
						<div className="mb-6 p-4 bg-red-950/50 border border-red-900 rounded-md">
							<h3 className="font-semibold text-white mb-1">
								Stale Shift Found
							</h3>
							<p className="text-sm text-zinc-300">
								A shift was left open on{" "}
								{new Date(currentStaleShift.start_time).toLocaleDateString()}.
							</p>
						</div>
					) : (
						<div className="mb-6 p-4 bg-orange-950/50 border border-orange-900 rounded-md">
							<h3 className="font-semibold text-white mb-1">Missing Day</h3>
							<p className="text-sm text-zinc-300">
								No shift was recorded for {currentGapDate}.
							</p>
						</div>
					)}

					<form onSubmit={handleResolve} className="space-y-4">
						<div className="space-y-2">
							<Label>Resolution Status</Label>
							<select
								value={status}
								onChange={(e) =>
									setStatus(e.target.value as "SHOP_CLOSED" | "DATA_FILLED")
								}
								className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-950 dark:ring-offset-zinc-950 dark:placeholder:text-zinc-400 dark:focus-visible:ring-zinc-300"
							>
								<option value="SHOP_CLOSED">Shop Was Closed</option>
								<option value="DATA_FILLED">Enter Missing Data</option>
							</select>
						</div>

						{status === "DATA_FILLED" && (
							<div className="grid grid-cols-2 gap-4">
								<div className="space-y-2">
									<Label>Expected Cash ($)</Label>
									<Input
										type="number"
										step="0.01"
										required
										value={expectedCash}
										onChange={(e) => setExpectedCash(e.target.value)}
									/>
								</div>
								<div className="space-y-2">
									<Label>Actual Cash ($)</Label>
									<Input
										type="number"
										step="0.01"
										required
										value={actualCash}
										onChange={(e) => setActualCash(e.target.value)}
									/>
								</div>
							</div>
						)}

						<div className="space-y-2">
							<Label>Notes (Optional)</Label>
							<Input
								placeholder="Reason or context..."
								value={notes}
								onChange={(e) => setNotes(e.target.value)}
							/>
						</div>

						<Button type="submit" className="w-full mt-4" disabled={resolving}>
							{resolving ? "Resolving..." : "Resolve & Continue"}
						</Button>
					</form>
				</CardContent>
			</Card>
			<p className="mt-4 text-sm text-zinc-500">
				{missedData.missedShifts.length + missedData.gapDates.length - 1} more
				items remaining after this.
			</p>
		</div>
	);
}
