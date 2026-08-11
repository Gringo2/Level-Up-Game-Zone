import type {
	Credit,
	Expense,
	GameSalesLog,
	KenoLog,
	Shift,
} from "@level-up/shared";
import { format } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import {
	Cell,
	Pie,
	PieChart,
	Tooltip as RechartsTooltip,
	ResponsiveContainer,
	type TooltipValueType,
} from "recharts";
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
import { useAuth } from "../contexts/AuthContext";
import { auth } from "../firebase";
import { API_BASE, safeJson } from "../lib/api";
import { SHOP_TIMEZONE } from "../lib/dateUtils";

export function Reports() {
	const { user } = useAuth();
	const [inputStartDate, setInputStartDate] = useState(
		formatInTimeZone(new Date(), SHOP_TIMEZONE, "yyyy-MM-dd"),
	);
	const [inputEndDate, setInputEndDate] = useState(
		formatInTimeZone(new Date(), SHOP_TIMEZONE, "yyyy-MM-dd"),
	);

	const [appliedStartDate, setAppliedStartDate] = useState(inputStartDate);
	const [appliedEndDate, setAppliedEndDate] = useState(inputEndDate);

	const [shifts, setShifts] = useState<Shift[]>([]);
	const [gameSales, setGameSales] = useState<GameSalesLog[]>([]);
	const [kenoLogs, setKenoLogs] = useState<KenoLog[]>([]);
	const [credits, setCredits] = useState<Credit[]>([]);
	const [expenses, setExpenses] = useState<Expense[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		if (!user) return;
		let mounted = true;
		setLoading(true);

		const startIso = new Date(
			`${appliedStartDate}T00:00:00+03:00`,
		).toISOString();
		const endIso = new Date(
			`${appliedEndDate}T23:59:59.999+03:00`,
		).toISOString();

		const loadReports = async () => {
			try {
				const token = await auth.currentUser?.getIdToken();
				if (!token) throw new Error("Not authenticated");

				const [
					shiftsResponse,
					salesResponse,
					kenoResponse,
					creditsResponse,
					expensesResponse,
				] = await Promise.all([
					fetch(`${API_BASE}/api/shifts`, {
						headers: { Authorization: `Bearer ${token}` },
					}),
					fetch(`${API_BASE}/api/sales`, {
						headers: { Authorization: `Bearer ${token}` },
					}),
					fetch(`${API_BASE}/api/keno`, {
						headers: { Authorization: `Bearer ${token}` },
					}),
					fetch(`${API_BASE}/api/credits`, {
						headers: { Authorization: `Bearer ${token}` },
					}),
					fetch(`${API_BASE}/api/expenses`, {
						headers: { Authorization: `Bearer ${token}` },
					}),
				]);

				if (!shiftsResponse.ok) {
					throw new Error("Failed to fetch shifts");
				}
				if (!salesResponse.ok) {
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

				const [shiftsData, salesData, kenoData, creditsData, expensesData] =
					await Promise.all([
						safeJson<Shift[]>(shiftsResponse),
						safeJson<GameSalesLog[]>(salesResponse),
						safeJson<KenoLog[]>(kenoResponse),
						safeJson<Credit[]>(creditsResponse),
						safeJson<Expense[]>(expensesResponse),
					]);

				if (!mounted) return;

				setShifts(
					(shiftsData as Shift[]).filter(
						(shift) =>
							shift.start_time >= startIso && shift.start_time <= endIso,
					),
				);
				setGameSales(
					(salesData as GameSalesLog[]).filter(
						(log) => log.date >= startIso && log.date <= endIso,
					),
				);
				setKenoLogs(
					(kenoData as KenoLog[]).filter(
						(log) => log.date >= startIso && log.date <= endIso,
					),
				);
				setCredits(
					(creditsData as Credit[]).filter(
						(log) => log.date >= startIso && log.date <= endIso,
					),
				);
				setExpenses(
					(expensesData as Expense[]).filter(
						(log) => log.date >= startIso && log.date <= endIso,
					),
				);
				setLoading(false);
			} catch (err) {
				console.error(err);
				if (mounted) {
					toast.error("Failed to load reports data");
					setLoading(false);
				}
			}
		};

		void loadReports();
		return () => {
			mounted = false;
		};
	}, [appliedStartDate, appliedEndDate, user]);

	const handleApply = () => {
		setAppliedStartDate(inputStartDate);
		setAppliedEndDate(inputEndDate);
	};

	// --- Aggregations ---
	const totalGameSales = gameSales.reduce(
		(sum, log) => sum + log.calculated_total,
		0,
	);
	const totalKenoNet = kenoLogs.reduce((sum, log) => sum + log.net_profit, 0);
	const totalExpenses = expenses.reduce((sum, log) => sum + log.amount, 0);

	const closedShifts = shifts.filter((s) => s.status === "CLOSED");
	const totalVariance = closedShifts.reduce(
		(sum, s) => sum + (s.variance || 0),
		0,
	);
	const avgVariance =
		closedShifts.length > 0 ? totalVariance / closedShifts.length : 0;

	const netProfit = totalGameSales + totalKenoNet - totalExpenses;

	// Revenue Mix
	const revenueMix = [
		{ name: "Game Sales", value: totalGameSales },
		{ name: "Keno Net", value: totalKenoNet > 0 ? totalKenoNet : 0 },
	].filter((item) => item.value > 0);
	const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

	// Expense Breakdown
	const expensesByCategory = expenses.reduce(
		(acc, exp) => {
			const cat = exp.category || "Misc";
			acc[cat] = (acc[cat] || 0) + exp.amount;
			return acc;
		},
		{} as Record<string, number>,
	);
	const expenseData = Object.keys(expensesByCategory).map((key) => ({
		name: key,
		value: expensesByCategory[key],
	}));

	// Staff Accountability (Payroll Export)
	// We need to group Variances (from shifts) and Deducted Credits (from credits) by employee
	const staffData: Record<string, { variances: number; deductions: number }> =
		{};

	closedShifts.forEach((s) => {
		if (!staffData[s.manager_name])
			staffData[s.manager_name] = { variances: 0, deductions: 0 };
		staffData[s.manager_name].variances += s.variance || 0;
	});

	credits
		.filter((c) => c.status === "Deducted")
		.forEach((c) => {
			if (!staffData[c.employee_name])
				staffData[c.employee_name] = { variances: 0, deductions: 0 };
			staffData[c.employee_name].deductions += c.amount;
		});

	const staffList = Object.keys(staffData).sort();

	return (
		<div className="space-y-6">
			<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
				<div>
					<h2 className="text-2xl font-bold tracking-tight">
						Historical Reports
					</h2>
					<p className="text-zinc-500">
						Analyze revenue, expenses, and staff accountability.
					</p>
				</div>
				<div className="flex items-center gap-2">
					<Input
						type="date"
						value={inputStartDate}
						onChange={(e) => setInputStartDate(e.target.value)}
						className="w-auto"
					/>
					<span className="text-zinc-500">to</span>
					<Input
						type="date"
						value={inputEndDate}
						onChange={(e) => setInputEndDate(e.target.value)}
						className="w-auto"
					/>
					<Button onClick={handleApply}>Apply</Button>
					<Button variant="outline" onClick={() => window.print()}>
						Print
					</Button>
				</div>
			</div>

			{/* Print Header */}
			<div className="hidden print:block mb-8">
				<h1 className="text-3xl font-bold">Financial Report</h1>
				<p className="text-lg text-zinc-600">
					{format(new Date(`${appliedStartDate}T00:00:00`), "MMM d, yyyy")} -{" "}
					{format(new Date(`${appliedEndDate}T23:59:59`), "MMM d, yyyy")}
				</p>
			</div>

			{loading ? (
				<div className="flex justify-center p-12">
					<Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
				</div>
			) : (
				<>
					{/* Top Level Metrics */}
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
						<Card className="bg-zinc-900 text-white border-zinc-800">
							<CardHeader className="pb-2">
								<CardTitle className="text-sm font-medium text-zinc-400">
									Net Profit
								</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="text-3xl font-bold">
									${netProfit.toFixed(2)}
								</div>
							</CardContent>
						</Card>
						<Card>
							<CardHeader className="pb-2">
								<CardTitle className="text-sm font-medium text-zinc-500">
									Total Revenue
								</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="text-2xl font-bold">
									${(totalGameSales + totalKenoNet).toFixed(2)}
								</div>
							</CardContent>
						</Card>
						<Card>
							<CardHeader className="pb-2">
								<CardTitle className="text-sm font-medium text-zinc-500">
									Total Expenses
								</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="text-2xl font-bold text-red-600">
									-${totalExpenses.toFixed(2)}
								</div>
							</CardContent>
						</Card>
						<Card>
							<CardHeader className="pb-2">
								<CardTitle className="text-sm font-medium text-zinc-500">
									Avg Shift Variance
								</CardTitle>
							</CardHeader>
							<CardContent>
								<div
									className={`text-2xl font-bold ${avgVariance < 0 ? "text-red-600" : avgVariance > 0 ? "text-emerald-600" : ""}`}
								>
									${avgVariance.toFixed(2)}
								</div>
								<p className="text-xs text-zinc-400 mt-1">
									Across {closedShifts.length} closed shifts
								</p>
							</CardContent>
						</Card>
					</div>

					<div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:block print:space-y-6">
						{/* Revenue Mix */}
						<Card className="print:break-inside-avoid">
							<CardHeader>
								<CardTitle>Revenue Mix</CardTitle>
								<CardDescription>Breakdown of income sources.</CardDescription>
							</CardHeader>
							<CardContent className="flex flex-col items-center">
								{revenueMix.length > 0 ? (
									<div className="h-64 w-full">
										<ResponsiveContainer width="100%" height="100%">
											<PieChart>
												<Pie
													data={revenueMix}
													cx="50%"
													cy="50%"
													innerRadius={60}
													outerRadius={80}
													paddingAngle={5}
													dataKey="value"
												>
													{revenueMix.map((_entry, index) => (
														<Cell
															key={`cell-${_entry.name || index}`}
															fill={COLORS[index % COLORS.length]}
														/>
													))}
												</Pie>
												<RechartsTooltip
													formatter={(value: TooltipValueType | undefined) =>
														`$${Number(value ?? 0).toFixed(2)}`
													}
												/>
											</PieChart>
										</ResponsiveContainer>
									</div>
								) : (
									<div className="h-64 flex items-center justify-center text-zinc-500">
										No revenue data
									</div>
								)}
								<div className="flex gap-4 mt-4 w-full justify-center">
									{revenueMix.map((entry, index) => (
										<div key={entry.name} className="flex items-center gap-2">
											<div
												className="w-3 h-3 rounded-full"
												style={{
													backgroundColor: COLORS[index % COLORS.length],
												}}
											></div>
											<span className="text-sm font-medium">
												{entry.name} (${entry.value.toFixed(2)})
											</span>
										</div>
									))}
								</div>
							</CardContent>
						</Card>

						{/* Expense Breakdown */}
						<Card className="print:break-inside-avoid">
							<CardHeader>
								<CardTitle>The "Burn" Report</CardTitle>
								<CardDescription>Expenses categorized.</CardDescription>
							</CardHeader>
							<CardContent className="flex flex-col items-center">
								{expenseData.length > 0 ? (
									<div className="h-64 w-full">
										<ResponsiveContainer width="100%" height="100%">
											<PieChart>
												<Pie
													data={expenseData}
													cx="50%"
													cy="50%"
													innerRadius={60}
													outerRadius={80}
													paddingAngle={5}
													dataKey="value"
												>
													{expenseData.map((_entry, index) => (
														<Cell
															key={`cell-${_entry.name || index}`}
															fill={COLORS[index % COLORS.length]}
														/>
													))}
												</Pie>
												<RechartsTooltip
													formatter={(value: TooltipValueType | undefined) =>
														`$${Number(value ?? 0).toFixed(2)}`
													}
												/>
											</PieChart>
										</ResponsiveContainer>
									</div>
								) : (
									<div className="h-64 flex items-center justify-center text-zinc-500">
										No expense data
									</div>
								)}
								<div className="flex flex-wrap gap-4 mt-4 w-full justify-center">
									{expenseData.map((entry, index) => (
										<div key={entry.name} className="flex items-center gap-2">
											<div
												className="w-3 h-3 rounded-full"
												style={{
													backgroundColor: COLORS[index % COLORS.length],
												}}
											></div>
											<span className="text-sm font-medium">
												{entry.name} (${entry.value.toFixed(2)})
											</span>
										</div>
									))}
								</div>
							</CardContent>
						</Card>
					</div>

					{/* Staff Accountability Table */}
					<Card className="print:break-inside-avoid">
						<CardHeader>
							<CardTitle>Staff Accountability & Payroll Export</CardTitle>
							<CardDescription>
								Summary of shift variances and salary deductions per employee.
							</CardDescription>
						</CardHeader>
						<CardContent>
							{staffList.length === 0 ? (
								<div className="text-center text-zinc-500 py-4">
									No staff data in this period.
								</div>
							) : (
								<div className="overflow-x-auto">
									<table className="w-full text-sm text-left">
										<thead className="text-xs text-zinc-500 uppercase bg-zinc-50 border-b">
											<tr>
												<th className="px-4 py-3 font-medium">Cashier Name</th>
												<th className="px-4 py-3 font-medium text-right">
													Total Shift Variances
												</th>
												<th className="px-4 py-3 font-medium text-right">
													Unpaid Credits (Deducted)
												</th>
												<th className="px-4 py-3 font-medium text-right">
													Total Deduction
												</th>
											</tr>
										</thead>
										<tbody>
											{staffList.map((name) => {
												const data = staffData[name];
												const totalDeduction =
													(data.variances < 0 ? Math.abs(data.variances) : 0) +
													data.deductions;
												return (
													<tr key={name} className="border-b last:border-0">
														<td className="px-4 py-3 font-medium">{name}</td>
														<td
															className={`px-4 py-3 text-right ${data.variances < 0 ? "text-red-600 font-medium" : data.variances > 0 ? "text-emerald-600" : ""}`}
														>
															${data.variances.toFixed(2)}
														</td>
														<td className="px-4 py-3 text-right text-red-600 font-medium">
															${data.deductions.toFixed(2)}
														</td>
														<td className="px-4 py-3 text-right font-bold text-red-600">
															${totalDeduction.toFixed(2)}
														</td>
													</tr>
												);
											})}
										</tbody>
									</table>
								</div>
							)}
						</CardContent>
					</Card>

					{/* Detailed Logs */}
					<div className="space-y-6 print:break-before-page">
						<h3 className="text-xl font-bold tracking-tight">Detailed Logs</h3>

						{/* Game Sales Logs */}
						<Card className="print:break-inside-avoid">
							<CardHeader>
								<CardTitle>Game Sales</CardTitle>
								<CardDescription>
									Individual game sales logged in this period.
								</CardDescription>
							</CardHeader>
							<CardContent>
								{gameSales.length === 0 ? (
									<div className="text-center text-zinc-500 py-4">
										No game sales in this period.
									</div>
								) : (
									<div className="overflow-x-auto">
										<table className="w-full text-sm text-left">
											<thead className="text-xs text-zinc-500 uppercase bg-zinc-50 border-b">
												<tr>
													<th className="px-4 py-3 font-medium">Date & Time</th>
													<th className="px-4 py-3 font-medium">Game</th>
													<th className="px-4 py-3 font-medium text-right">
														Quantity (Mins)
													</th>
													<th className="px-4 py-3 font-medium text-right">
														Total
													</th>
												</tr>
											</thead>
											<tbody>
												{[...gameSales]
													.sort(
														(a, b) =>
															new Date(b.date).getTime() -
															new Date(a.date).getTime(),
													)
													.map((log) => (
														<tr key={log.id} className="border-b last:border-0">
															<td className="px-4 py-3">
																{format(
																	new Date(log.date),
																	"MMM d, yyyy h:mm a",
																)}
															</td>
															<td className="px-4 py-3 font-medium">
																{log.game_name}
															</td>
															<td className="px-4 py-3 text-right">
																{log.quantity_sold}
															</td>
															<td className="px-4 py-3 text-right font-medium">
																${log.calculated_total.toFixed(2)}
															</td>
														</tr>
													))}
											</tbody>
										</table>
									</div>
								)}
							</CardContent>
						</Card>

						{/* Keno Logs */}
						<Card className="print:break-inside-avoid">
							<CardHeader>
								<CardTitle>Keno Logs</CardTitle>
								<CardDescription>
									Keno sales and payouts logged in this period.
								</CardDescription>
							</CardHeader>
							<CardContent>
								{kenoLogs.length === 0 ? (
									<div className="text-center text-zinc-500 py-4">
										No Keno logs in this period.
									</div>
								) : (
									<div className="overflow-x-auto">
										<table className="w-full text-sm text-left">
											<thead className="text-xs text-zinc-500 uppercase bg-zinc-50 border-b">
												<tr>
													<th className="px-4 py-3 font-medium">Date & Time</th>
													<th className="px-4 py-3 font-medium text-right">
														Sales
													</th>
													<th className="px-4 py-3 font-medium text-right">
														Payouts
													</th>
													<th className="px-4 py-3 font-medium text-right">
														Net Profit
													</th>
												</tr>
											</thead>
											<tbody>
												{[...kenoLogs]
													.sort(
														(a, b) =>
															new Date(b.date).getTime() -
															new Date(a.date).getTime(),
													)
													.map((log) => (
														<tr key={log.id} className="border-b last:border-0">
															<td className="px-4 py-3">
																{format(
																	new Date(log.date),
																	"MMM d, yyyy h:mm a",
																)}
															</td>
															<td className="px-4 py-3 text-right">
																${log.sales.toFixed(2)}
															</td>
															<td className="px-4 py-3 text-right text-red-600">
																-${log.payouts.toFixed(2)}
															</td>
															<td
																className={`px-4 py-3 text-right font-medium ${log.net_profit < 0 ? "text-red-600" : "text-emerald-600"}`}
															>
																${log.net_profit.toFixed(2)}
															</td>
														</tr>
													))}
											</tbody>
										</table>
									</div>
								)}
							</CardContent>
						</Card>

						{/* Expense Logs */}
						<Card className="print:break-inside-avoid">
							<CardHeader>
								<CardTitle>Expenses</CardTitle>
								<CardDescription>
									Expenses logged in this period.
								</CardDescription>
							</CardHeader>
							<CardContent>
								{expenses.length === 0 ? (
									<div className="text-center text-zinc-500 py-4">
										No expenses in this period.
									</div>
								) : (
									<div className="overflow-x-auto">
										<table className="w-full text-sm text-left">
											<thead className="text-xs text-zinc-500 uppercase bg-zinc-50 border-b">
												<tr>
													<th className="px-4 py-3 font-medium">Date & Time</th>
													<th className="px-4 py-3 font-medium">Category</th>
													<th className="px-4 py-3 font-medium">Description</th>
													<th className="px-4 py-3 font-medium text-right">
														Amount
													</th>
												</tr>
											</thead>
											<tbody>
												{[...expenses]
													.sort(
														(a, b) =>
															new Date(b.date).getTime() -
															new Date(a.date).getTime(),
													)
													.map((log) => (
														<tr key={log.id} className="border-b last:border-0">
															<td className="px-4 py-3">
																{format(
																	new Date(log.date),
																	"MMM d, yyyy h:mm a",
																)}
															</td>
															<td className="px-4 py-3">
																<span className="px-2 py-1 bg-zinc-100 rounded-md text-xs">
																	{log.category || "Misc"}
																</span>
															</td>
															<td className="px-4 py-3">{log.description}</td>
															<td className="px-4 py-3 text-right font-medium text-red-600">
																-${log.amount.toFixed(2)}
															</td>
														</tr>
													))}
											</tbody>
										</table>
									</div>
								)}
							</CardContent>
						</Card>
					</div>
				</>
			)}
		</div>
	);
}
