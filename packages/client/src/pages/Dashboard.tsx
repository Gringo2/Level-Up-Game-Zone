import type {
	Credit,
	Expense,
	GameSalesLog,
	KenoLog,
	SportsBettingLog,
} from "@level-up/shared";
import { CREDIT_STATUSES } from "@level-up/shared";
import { format } from "date-fns";
import {
	Coins,
	CreditCard,
	Gamepad2,
	Loader2,
	Receipt,
	Trophy,
} from "lucide-react";
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
import { ConfirmDialog } from "../components/ui/confirm-dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { useAuth } from "../contexts/AuthContext";
import { useShift } from "../contexts/ShiftContext";
import { API_BASE, authFetch, safeJson } from "../lib/api";
import { formatSafeDate, getShopStartOfDay } from "../lib/dateUtils";

export function Dashboard() {
	const { user } = useAuth();
	const { activeShift, loadingShift, refetchShift } = useShift();

	const [closingCash, setClosingCash] = useState("");
	const [shortageReason, setShortageReason] = useState("");
	const [isClosing, setIsClosing] = useState(false);
	const [showCloseConfirm, setShowCloseConfirm] = useState(false);
	const [isSubmittingClose, setIsSubmittingClose] = useState(false);
	const [isUpdatingFloat, setIsUpdatingFloat] = useState(false);
	const [isSubmittingFloat, setIsSubmittingFloat] = useState(false);
	const [newFloat, setNewFloat] = useState("");
	const [isStarting, setIsStarting] = useState(false);
	const [startFloat, setStartFloat] = useState("");
	const [isSubmittingStart, setIsSubmittingStart] = useState(false);

	const [gameSales, setGameSales] = useState<GameSalesLog[]>([]);
	const [kenoLogs, setKenoLogs] = useState<KenoLog[]>([]);
	const [credits, setCredits] = useState<Credit[]>([]);
	const [expenses, setExpenses] = useState<Expense[]>([]);
	const [sportsBettingLogs, setSportsBettingLogs] = useState<
		SportsBettingLog[]
	>([]);

	useEffect(() => {
		let mounted = true;

		const loadDashboardData = async () => {
			try {
				const start = activeShift
					? activeShift.start_time
					: getShopStartOfDay().toISOString();

				const [
					gamesResponse,
					kenoResponse,
					creditsResponse,
					expensesResponse,
					bettingResponse,
				] = await Promise.all([
					authFetch(
						`${API_BASE}/api/sales?startDate=${encodeURIComponent(start)}`,
					),
					authFetch(
						`${API_BASE}/api/keno?startDate=${encodeURIComponent(start)}`,
					),
					authFetch(
						`${API_BASE}/api/credits?startDate=${encodeURIComponent(start)}`,
					),
					authFetch(
						`${API_BASE}/api/expenses?startDate=${encodeURIComponent(start)}`,
					),
					authFetch(
						`${API_BASE}/api/sports-betting?startDate=${encodeURIComponent(start)}`,
					),
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

				const [gamesData, kenoData, creditsData, expensesData, bettingData] =
					await Promise.all([
						safeJson<GameSalesLog[]>(gamesResponse),
						safeJson<KenoLog[]>(kenoResponse),
						safeJson<Credit[]>(creditsResponse),
						safeJson<Expense[]>(expensesResponse),
						safeJson<SportsBettingLog[]>(bettingResponse),
					]);

				if (!mounted) return;

				setGameSales(gamesData as GameSalesLog[]);
				setKenoLogs(kenoData as KenoLog[]);
				setCredits(creditsData as Credit[]);
				setExpenses(expensesData as Expense[]);
				setSportsBettingLogs(Array.isArray(bettingData) ? bettingData : []);
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
	const gameSalesByItem = Object.values(
		gameSales.reduce(
			(acc, log) => {
				const key = log.game_name || "Unknown Game";
				if (!acc[key]) {
					acc[key] = {
						gameName: key,
						totalQuantity: 0,
						totalRevenue: 0,
						unitType: log.unit_type || "Hour",
						count: 0,
					};
				}
				acc[key].totalQuantity += Number(log.quantity_sold) || 0;
				acc[key].totalRevenue += Number(log.calculated_total) || 0;
				acc[key].count += 1;
				return acc;
			},
			{} as Record<
				string,
				{
					gameName: string;
					totalQuantity: number;
					totalRevenue: number;
					unitType: string;
					count: number;
				}
			>,
		),
	).sort((a, b) => b.totalRevenue - a.totalRevenue);

	const totalKenoNet = kenoLogs.reduce((sum, log) => sum + log.net_profit, 0);
	const totalSportsBettingNet = sportsBettingLogs.reduce(
		(sum, log) => sum + log.net_profit,
		0,
	);
	const pendingCredits = credits
		.filter((c) => c.status === CREDIT_STATUSES.PENDING)
		.reduce((sum, log) => sum + log.amount, 0);
	const totalExpenses = expenses.reduce((sum, log) => sum + log.amount, 0);

	const expectedCash =
		(activeShift?.opening_float || 0) +
		totalKenoNet +
		totalGameSales +
		totalSportsBettingNet -
		totalExpenses -
		pendingCredits;
	const variance = closingCash ? parseFloat(closingCash) - expectedCash : 0;
	const safeVariance = Number.isNaN(variance) ? 0 : variance;

	const handleCloseShift = (e: React.FormEvent) => {
		e.preventDefault();
		if (!activeShift || !closingCash) return;
		if (Math.abs(safeVariance) > 2 && !shortageReason) {
			toast.error("Variance is greater than $2.00. Please provide a reason.");
			return;
		}
		setShowCloseConfirm(true);
	};

	const executeCloseShift = async () => {
		if (!activeShift || !closingCash) return;
		setIsSubmittingClose(true);
		try {
			const response = await authFetch(
				`${API_BASE}/api/shifts/${activeShift.id}/close`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
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
			setShowCloseConfirm(false);
			await refetchShift();
			toast.success("Shift closed successfully!");
			// biome-ignore lint/suspicious/noExplicitAny: API error response
		} catch (err: any) {
			console.error(err);
			toast.error(err.message || "Error closing shift");
		} finally {
			setIsSubmittingClose(false);
		}
	};

	const handleStartShift = async (e: React.FormEvent) => {
		e.preventDefault();
		if (
			!startFloat ||
			Number.isNaN(parseFloat(startFloat)) ||
			parseFloat(startFloat) < 0
		) {
			toast.error("Please provide a valid non-negative opening float");
			return;
		}
		setIsSubmittingStart(true);
		try {
			const response = await authFetch(`${API_BASE}/api/shifts`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					floatAmount: parseFloat(startFloat),
					managerName: user?.displayName || user?.email || "Unknown",
				}),
			});

			const data = await safeJson(response);
			if (!response.ok) throw new Error(data.error || "Failed to start shift");

			setStartFloat("");
			setIsStarting(false);
			await refetchShift();
			toast.success("Shift started successfully!");
			// biome-ignore lint/suspicious/noExplicitAny: API error response
		} catch (err: any) {
			console.error(err);
			toast.error(err.message || "Error starting shift");
		} finally {
			setIsSubmittingStart(false);
		}
	};

	const handleUpdateFloat = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!activeShift) return;
		const parsedFloat = parseFloat(newFloat);
		if (!newFloat || Number.isNaN(parsedFloat) || parsedFloat < 0) {
			toast.error("Please provide a valid non-negative float amount");
			return;
		}
		setIsSubmittingFloat(true);
		try {
			const response = await authFetch(
				`${API_BASE}/api/shifts/${activeShift.id}/float`,
				{
					method: "PUT",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({ floatAmount: parsedFloat }),
				},
			);
			if (!response.ok) throw new Error("Failed to update float");

			setNewFloat("");
			setIsUpdatingFloat(false);
			await refetchShift();
			toast.success("Float updated successfully!");
		} catch (err) {
			console.error(err);
			toast.error("Failed to update float");
		} finally {
			setIsSubmittingFloat(false);
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
						{formatSafeDate(activeShift?.start_time, "h:mm a", "")}
					</p>
				</div>
				<h2 className="text-xl font-bold mt-6 border-b pb-2">Revenue</h2>
				<p>Keno Net: ${totalKenoNet.toFixed(2)}</p>
				<p>Sports Betting Net: ${totalSportsBettingNet.toFixed(2)}</p>
				<p>Games Total: ${totalGameSales.toFixed(2)}</p>
				{gameSalesByItem.length > 0 && (
					<ul className="ml-4 text-sm list-disc">
						{gameSalesByItem.map((item) => {
							const unitLabel =
								item.unitType.toLowerCase() === "hour"
									? item.totalQuantity === 1
										? "hr"
										: "hrs"
									: item.totalQuantity === 1
										? "game"
										: "games";
							return (
								<li key={item.gameName}>
									{item.gameName} ({item.totalQuantity} {unitLabel}): $
									{item.totalRevenue.toFixed(2)}
								</li>
							);
						})}
					</ul>
				)}
				<h2 className="text-xl font-bold mt-6 border-b pb-2">Cash Movements</h2>
				<p>Expenses: ${totalExpenses.toFixed(2)}</p>
				<p>Pending Credits: ${pendingCredits.toFixed(2)}</p>
				<h2 className="text-xl font-bold mt-6 border-b pb-2">Bottom Line</h2>
				<p>Opening Float: ${(activeShift?.opening_float || 0).toFixed(2)}</p>
				<p>Expected Cash: ${expectedCash.toFixed(2)}</p>
				<p>Actual Cash: ${closingCash || "_____"}</p>
				<p>Variance: ${safeVariance.toFixed(2)}</p>
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

				<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
					<Card data-testid="kpi-game-sales">
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="text-sm font-medium">Game Sales</CardTitle>
							<Gamepad2 className="h-4 w-4 text-zinc-500" />
						</CardHeader>
						<CardContent className="space-y-2">
							<div className="text-2xl font-bold">
								${totalGameSales.toFixed(2)}
							</div>
							{gameSalesByItem.length === 0 ? (
								<p className="text-xs text-zinc-500">
									No sales logged this shift
								</p>
							) : (
								<>
									<div className="space-y-1.5 pt-1">
										{gameSalesByItem.slice(0, 3).map((item) => {
											const unitLabel =
												item.unitType.toLowerCase() === "hour"
													? item.totalQuantity === 1
														? "hr"
														: "hrs"
													: item.totalQuantity === 1
														? "game"
														: "games";
											return (
												<div
													key={item.gameName}
													className="flex items-center justify-between text-xs gap-1"
												>
													<div className="flex items-center gap-1.5 min-w-0">
														<span className="font-semibold text-zinc-900 truncate">
															{item.gameName}
														</span>
														<span className="inline-flex items-center px-1.5 py-0.2 rounded text-[11px] font-medium bg-zinc-100 text-zinc-600 shrink-0">
															{item.totalQuantity} {unitLabel}
														</span>
													</div>
													<span className="font-bold text-zinc-900 shrink-0">
														${item.totalRevenue.toFixed(2)}
													</span>
												</div>
											);
										})}
										{gameSalesByItem.length > 3 && (
											<p className="text-[11px] text-zinc-400 text-right">
												+{gameSalesByItem.length - 3} more games
											</p>
										)}
									</div>

									{/* Segmented Distribution Bar */}
									<div
										data-testid="game-sales-distribution-bar"
										className="h-1.5 w-full rounded-full bg-zinc-100 overflow-hidden flex"
										title="Sales distribution by game"
									>
										{gameSalesByItem.map((item, idx) => {
											const sharePercent =
												totalGameSales > 0
													? (item.totalRevenue / totalGameSales) * 100
													: 0;
											const barColors = [
												"bg-emerald-500",
												"bg-blue-500",
												"bg-purple-500",
												"bg-amber-500",
												"bg-indigo-500",
											];
											const colorClass = barColors[idx % barColors.length];
											return (
												<div
													key={item.gameName}
													className={`${colorClass} h-full transition-all`}
													style={{ width: `${sharePercent}%` }}
													title={`${item.gameName}: ${sharePercent.toFixed(1)}%`}
												/>
											);
										})}
									</div>
								</>
							)}
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
					<Card data-testid="kpi-sports-betting">
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="text-sm font-medium">
								Sports Betting
							</CardTitle>
							<Trophy className="h-4 w-4 text-zinc-500" />
						</CardHeader>
						<CardContent>
							<div
								className={`text-2xl font-bold ${
									totalSportsBettingNet < 0 ? "text-red-500" : ""
								}`}
							>
								${totalSportsBettingNet.toFixed(2)}
							</div>
							{sportsBettingLogs.length === 0 ? (
								<p className="text-xs text-zinc-500">No entries this shift</p>
							) : (
								<p className="text-xs text-zinc-500">
									{sportsBettingLogs.length}{" "}
									{sportsBettingLogs.length === 1 ? "entry" : "entries"}
								</p>
							)}
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
								Started at{" "}
								{formatSafeDate(activeShift.start_time, "h:mm a", "recently")}
							</CardDescription>
						</CardHeader>
						<CardContent>
							{!isClosing ? (
								<div className="space-y-4">
									<div className="flex gap-2">
										<Button
											onClick={() => setIsClosing(true)}
											className="flex-1 bg-white text-black hover:bg-zinc-200"
										>
											Close Shift (Blind Count)
										</Button>
										{!isUpdatingFloat && (
											<Button
												onClick={() => {
													setNewFloat(activeShift.opening_float.toString());
													setIsUpdatingFloat(true);
												}}
												variant="outline"
												className="text-zinc-300 border-zinc-700 hover:bg-zinc-800"
											>
												Update Float
											</Button>
										)}
									</div>

									{isUpdatingFloat && (
										<form
											onSubmit={handleUpdateFloat}
											className="flex items-end gap-2 bg-zinc-800 p-4 rounded-md"
										>
											<div className="flex-1 space-y-2">
												<Label htmlFor="updateFloat" className="text-white">
													New Float Amount ($)
												</Label>
												<Input
													id="updateFloat"
													type="number"
													step="0.01"
													min="0"
													value={newFloat}
													onChange={(e) => setNewFloat(e.target.value)}
													className="bg-zinc-900 border-zinc-700 text-white"
													required
												/>
											</div>
											<Button
												type="submit"
												className="bg-emerald-600 hover:bg-emerald-700 text-white"
												disabled={isSubmittingFloat}
											>
												{isSubmittingFloat ? "Saving..." : "Save"}
											</Button>
											<Button
												type="button"
												variant="ghost"
												onClick={() => setIsUpdatingFloat(false)}
												disabled={isSubmittingFloat}
												className="text-zinc-400 hover:text-white hover:bg-zinc-700"
											>
												Cancel
											</Button>
										</form>
									)}
								</div>
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
												className={`text-2xl font-bold ${safeVariance < 0 ? "text-red-400" : safeVariance > 0 ? "text-emerald-400" : "text-white"}`}
											>
												${safeVariance.toFixed(2)}
											</div>
										</div>
									)}
									{Math.abs(safeVariance) > 2 && (
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
												(Math.abs(safeVariance) > 2 && !shortageReason)
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

				{!activeShift && (
					<Card className="bg-zinc-900 text-white border-zinc-800">
						<CardHeader>
							<CardTitle>No Active Shift</CardTitle>
							<CardDescription className="text-zinc-400">
								There is currently no active shift open for the register.
							</CardDescription>
						</CardHeader>
						<CardContent>
							{!isStarting ? (
								<Button
									onClick={() => setIsStarting(true)}
									className="bg-emerald-600 hover:bg-emerald-700 text-white"
								>
									Start Shift
								</Button>
							) : (
								<form
									onSubmit={handleStartShift}
									className="space-y-4 bg-zinc-800 p-4 rounded-md"
								>
									<div className="space-y-2">
										<Label htmlFor="startFloat" className="text-white">
											Opening Float Amount ($)
										</Label>
										<Input
											id="startFloat"
											type="number"
											step="0.01"
											min="0"
											value={startFloat}
											onChange={(e) => setStartFloat(e.target.value)}
											placeholder="0.00"
											className="bg-zinc-900 border-zinc-700 text-white"
											required
										/>
									</div>
									<div className="flex gap-2">
										<Button
											type="submit"
											className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
											disabled={!startFloat || isSubmittingStart}
										>
											{isSubmittingStart
												? "Starting..."
												: "Confirm & Start Shift"}
										</Button>
										<Button
											type="button"
											variant="outline"
											className="text-zinc-300 border-zinc-700 hover:bg-zinc-800"
											onClick={() => {
												setIsStarting(false);
												setStartFloat("");
											}}
											disabled={isSubmittingStart}
										>
											Cancel
										</Button>
									</div>
								</form>
							)}
						</CardContent>
					</Card>
				)}

				<ConfirmDialog
					open={showCloseConfirm}
					title="Confirm Shift Closure"
					message={`Are you sure you want to close this shift? This will finalize cash reconciliation (variance: $${safeVariance.toFixed(2)}) and close the register. This action cannot be undone.`}
					confirmLabel="Yes, Close Shift"
					confirmVariant="destructive"
					loading={isSubmittingClose}
					loadingLabel="Closing..."
					onConfirm={executeCloseShift}
					onCancel={() => setShowCloseConfirm(false)}
				/>
			</div>
		</div>
	);
}
