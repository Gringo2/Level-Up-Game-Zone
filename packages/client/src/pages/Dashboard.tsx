import type { Credit, Expense, GameSalesLog, KenoLog } from "@level-up/shared";
import { format } from "date-fns";
import { Coins, CreditCard, Gamepad2, Loader2, Receipt } from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { useShift } from "../contexts/ShiftContext";
import { auth } from "../firebase";
import { API_BASE, safeJson } from "../lib/api";
import { getShopStartOfDay } from "../lib/dateUtils";

export function Dashboard() {
	const { activeShift, loadingShift } = useShift();

	const [closingCash, setClosingCash] = useState("");
	const [shortageReason, setShortageReason] = useState("");
	const [isClosing, setIsClosing] = useState(false);

	const [gameSales, setGameSales] = useState<GameSalesLog[]>([]);
	const [kenoLogs, setKenoLogs] = useState<KenoLog[]>([]);
	const [credits, setCredits] = useState<Credit[]>([]);
	const [expenses, setExpenses] = useState<Expense[]>([]);

	useEffect(() => {
		let mounted = true;

		const loadDashboardData = async () => {
			try {
				const token = await auth.currentUser?.getIdToken();
				if (!token) throw new Error("Not authenticated");

				const start = activeShift
					? activeShift.start_time
					: getShopStartOfDay().toISOString();

				const [gamesResponse, kenoResponse, creditsResponse, expensesResponse] =
					await Promise.all([
						fetch(`${API_BASE}/api/sales`, {
							headers: {
								Authorization: `Bearer ${token}`,
							},
						}),
						fetch(`${API_BASE}/api/keno`, {
							headers: {
								Authorization: `Bearer ${token}`,
							},
						}),
						fetch(`${API_BASE}/api/credits`, {
							headers: {
								Authorization: `Bearer ${token}`,
							},
						}),
						fetch(`${API_BASE}/api/expenses`, {
							headers: {
								Authorization: `Bearer ${token}`,
							},
						}),
					]);

				if (!gamesResponse.ok) {
					throw new Error("Failed to fetch sales logs");
				}
				if (!kenoResponse.ok) {
					throw new Error("Failed to fetch keno logs");
				}
				if (!creditsResponse.ok) {
					throw new Error("Failed to fetch credits");
				}
				if (!expensesResponse.ok) {
					throw new Error("Failed to fetch expenses");
				}

				const [gamesData, kenoData, creditsData, expensesData] =
					await Promise.all([
						safeJson<GameSalesLog[]>(gamesResponse),
						safeJson<KenoLog[]>(kenoResponse),
						safeJson<Credit[]>(creditsResponse),
						safeJson<Expense[]>(expensesResponse),
					]);

				if (!mounted) return;

				setGameSales(
					(gamesData as GameSalesLog[]).filter((log) => log.date >= start),
				);
				setKenoLogs((kenoData as KenoLog[]).filter((log) => log.date >= start));
				setCredits(
					(creditsData as Credit[]).filter((log) => log.date >= start),
				);
				setExpenses(
					(expensesData as Expense[]).filter((log) => log.date >= start),
				);
			} catch (err) {
				console.error(err);
				if (mounted) {
					toast.error("Failed to load dashboard data");
				}
			}
		};

		void loadDashboardData();

		return () => {
			mounted = false;
		};
	}, [activeShift]);

	const totalGameSales = gameSales.reduce(
		(sum, log) => sum + log.calculated_total,
		0,
	);
	const totalKenoNet = kenoLogs.reduce((sum, log) => sum + log.net_profit, 0);
	const pendingCredits = credits
		.filter((c) => c.status === "Pending")
		.reduce((sum, log) => sum + log.amount, 0);
	const totalExpenses = expenses.reduce((sum, log) => sum + log.amount, 0);

	const expectedCash =
		(activeShift?.opening_float || 0) +
		totalKenoNet +
		totalGameSales -
		totalExpenses -
		pendingCredits;
	const variance = closingCash ? parseFloat(closingCash) - expectedCash : 0;

	const handleCloseShift = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!activeShift || !closingCash) return;
		if (Math.abs(variance) > 2 && !shortageReason) {
			toast.error("Variance is greater than $2.00. Please provide a reason.");
			return;
		}
		try {
			const token = await auth.currentUser?.getIdToken();
			if (!token) throw new Error("Not authenticated");

			const response = await fetch(
				`${API_BASE}/api/shifts/${activeShift.id}/close`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${token}`,
					},
					body: JSON.stringify({
						actualCashCounted: parseFloat(closingCash),
						shortageReason: shortageReason,
					}),
				},
			);

			const data = await safeJson(response);
			if (!response.ok) throw new Error(data.error || "Failed to close shift");

			setClosingCash("");
			setShortageReason("");
			setIsClosing(false);
			toast.success("Shift closed successfully!");
			// biome-ignore lint/suspicious/noExplicitAny: API error response
		} catch (err: any) {
			console.error(err);
			toast.error(err.message || "Error closing shift");
		}
	};

	if (loadingShift)
		return (
			<div className="p-8 text-center">
				<Loader2 className="animate-spin mx-auto" />
			</div>
		);

	return (
		<div className="space-y-6">
			{/* Safe Slip Print View (Hidden on screen) */}
			<div className="hidden print:block absolute top-0 left-0 w-full bg-white text-black p-8">
				<h1 className="text-2xl font-bold mb-4">Safe Slip (Z-Report)</h1>
				<div className="mb-4">
					<p>
						<strong>Date:</strong> {format(new Date(), "MMMM d, yyyy")}
					</p>
					<p>
						<strong>Manager:</strong> {activeShift?.manager_name}
					</p>
					<p>
						<strong>Shift Start:</strong>{" "}
						{activeShift
							? format(new Date(activeShift.start_time), "h:mm a")
							: ""}
					</p>
				</div>
				<h2 className="text-xl font-bold mt-6 border-b pb-2">Revenue</h2>
				<p>Keno Net: ${totalKenoNet.toFixed(2)}</p>
				<p>Games Total: ${totalGameSales.toFixed(2)}</p>
				<h2 className="text-xl font-bold mt-6 border-b pb-2">Cash Movements</h2>
				<p>Expenses: ${totalExpenses.toFixed(2)}</p>
				<p>Pending Credits: ${pendingCredits.toFixed(2)}</p>
				<h2 className="text-xl font-bold mt-6 border-b pb-2">Bottom Line</h2>
				<p>Opening Float: ${(activeShift?.opening_float || 0).toFixed(2)}</p>
				<p>Expected Cash: ${expectedCash.toFixed(2)}</p>
				<p>Actual Cash: ${closingCash || "_____"}</p>
				<p>Variance: ${variance.toFixed(2)}</p>
				{shortageReason && <p>Reason: {shortageReason}</p>}
				<div className="mt-16 flex justify-between">
					<div className="border-t border-black w-48 text-center pt-2">
						Manager Signature
					</div>
					<div className="border-t border-black w-48 text-center pt-2">
						Owner Signature
					</div>
				</div>
			</div>

			<div className="print:hidden space-y-6">
				<h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>

				<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
					<Card>
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="text-sm font-medium">Game Sales</CardTitle>
							<Gamepad2 className="h-4 w-4 text-zinc-500" />
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold">
								${totalGameSales.toFixed(2)}
							</div>
						</CardContent>
					</Card>
					<Card>
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="text-sm font-medium">Keno Net</CardTitle>
							<Coins className="h-4 w-4 text-zinc-500" />
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold">
								${totalKenoNet.toFixed(2)}
							</div>
						</CardContent>
					</Card>
					<Card>
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="text-sm font-medium">
								Pending Credits
							</CardTitle>
							<CreditCard className="h-4 w-4 text-zinc-500" />
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold text-red-500">
								-${pendingCredits.toFixed(2)}
							</div>
						</CardContent>
					</Card>
					<Card>
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="text-sm font-medium">Expenses</CardTitle>
							<Receipt className="h-4 w-4 text-zinc-500" />
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold text-red-500">
								-${totalExpenses.toFixed(2)}
							</div>
						</CardContent>
					</Card>
				</div>

				<h2 className="text-xl font-bold tracking-tight mt-8">
					Shift Management
				</h2>

				{activeShift && (
					<Card className="bg-zinc-900 text-white border-zinc-800">
						<CardHeader>
							<CardTitle>Active Shift: {activeShift.manager_name}</CardTitle>
							<CardDescription className="text-zinc-400">
								Started at {format(new Date(activeShift.start_time), "h:mm a")}
							</CardDescription>
						</CardHeader>
						<CardContent>
							{!isClosing ? (
								<Button
									onClick={() => setIsClosing(true)}
									className="w-full bg-white text-black hover:bg-zinc-200"
								>
									Close Shift (Blind Count)
								</Button>
							) : (
								<form
									onSubmit={handleCloseShift}
									className="space-y-4 mt-4 bg-zinc-800 p-4 rounded-md"
								>
									<div className="space-y-2">
										<Label htmlFor="closingCash" className="text-white">
											Actual Cash Counted ($)
										</Label>
										<Input
											id="closingCash"
											type="number"
											step="0.01"
											min="0"
											value={closingCash}
											onChange={(e) => setClosingCash(e.target.value)}
											className="bg-zinc-900 border-zinc-700 text-white"
											required
										/>
									</div>
									{closingCash && (
										<div className="p-4 bg-zinc-900 rounded-md border border-zinc-700">
											<div className="text-sm text-zinc-400 mb-1">
												Expected Cash: ${expectedCash.toFixed(2)}
											</div>
											<div className="text-sm text-zinc-400 mb-1">Variance</div>
											<div
												className={`text-2xl font-bold ${variance < 0 ? "text-red-400" : variance > 0 ? "text-emerald-400" : "text-white"}`}
											>
												${variance.toFixed(2)}
											</div>
										</div>
									)}
									{Math.abs(variance) > 2 && (
										<div className="space-y-2">
											<Label htmlFor="reason" className="text-red-400">
												Reason for Variance (Required)
											</Label>
											<Input
												id="reason"
												type="text"
												value={shortageReason}
												onChange={(e) => setShortageReason(e.target.value)}
												className="bg-zinc-900 border-red-900 text-white"
												required
											/>
										</div>
									)}
									<div className="flex gap-2">
										<Button
											type="submit"
											className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
											disabled={
												!closingCash ||
												(Math.abs(variance) > 2 && !shortageReason)
											}
										>
											Confirm & Close Shift
										</Button>
										<Button
											type="button"
											variant="outline"
											className="text-zinc-300 border-zinc-700 hover:bg-zinc-800"
											onClick={() => setIsClosing(false)}
										>
											Cancel
										</Button>
										{closingCash && (
											<Button
												type="button"
												variant="secondary"
												onClick={() => window.print()}
											>
												Print Safe Slip
											</Button>
										)}
									</div>
								</form>
							)}
						</CardContent>
					</Card>
				)}
			</div>
		</div>
	);
}
