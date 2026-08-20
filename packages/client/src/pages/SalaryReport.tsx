import type { Credit, Employee } from "@level-up/shared";
import { CREDIT_STATUSES } from "@level-up/shared";
import { format } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { Loader2, Printer, Receipt } from "lucide-react";
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
import { auth } from "../firebase";
import { API_BASE, safeJson } from "../lib/api";
import { SHOP_TIMEZONE } from "../lib/dateUtils";

export function SalaryReport() {
	const [credits, setCredits] = useState<Credit[]>([]);
	const [employees, setEmployees] = useState<Employee[]>([]);
	const [loading, setLoading] = useState(true);

	const [inputStartDate, setInputStartDate] = useState(
		formatInTimeZone(new Date(), SHOP_TIMEZONE, "yyyy-MM-dd"),
	);
	const [inputEndDate, setInputEndDate] = useState(
		formatInTimeZone(new Date(), SHOP_TIMEZONE, "yyyy-MM-dd"),
	);

	const [appliedStartDate, setAppliedStartDate] = useState(inputStartDate);
	const [appliedEndDate, setAppliedEndDate] = useState(inputEndDate);

	useEffect(() => {
		let mounted = true;

		const loadPayrollData = async () => {
			try {
				const token = await auth.currentUser?.getIdToken();
				if (!token) throw new Error("Not authenticated");

				const startIso = new Date(
					`${appliedStartDate}T00:00:00+03:00`,
				).toISOString();
				const endIso = new Date(
					`${appliedEndDate}T23:59:59.999+03:00`,
				).toISOString();

				const queryParams = `?startDate=${encodeURIComponent(startIso)}&endDate=${encodeURIComponent(endIso)}`;

				const [creditsResponse, employeesResponse] = await Promise.all([
					fetch(`${API_BASE}/api/credits${queryParams}`, {
						headers: { Authorization: `Bearer ${token}` },
					}),
					fetch(`${API_BASE}/api/employees`, {
						headers: { Authorization: `Bearer ${token}` },
					}),
				]);

				if (!creditsResponse.ok) {
					throw new Error("Failed to fetch salary deductions");
				}

				const creditsData = (await safeJson(creditsResponse)) as Credit[];
				const empData = employeesResponse.ok
					? ((await safeJson(employeesResponse)) as Employee[])
					: [];

				if (mounted) {
					setCredits(
						creditsData.filter((c) => c.status === CREDIT_STATUSES.DEDUCTED),
					);
					setEmployees(empData.filter((e) => e.isActive));
					setLoading(false);
				}
			} catch (err: unknown) {
				console.error(err);
				if (mounted) {
					toast.error("Failed to load payroll report");
					setLoading(false);
				}
			}
		};

		void loadPayrollData();
		return () => {
			mounted = false;
		};
	}, [appliedStartDate, appliedEndDate]);

	const handleApply = () => {
		setAppliedStartDate(inputStartDate);
		setAppliedEndDate(inputEndDate);
	};

	// Group credits by employee_id (fallback to lowercased name)
	const deductionsById: Record<string, Credit[]> = {};
	const deductionsByName: Record<string, Credit[]> = {};
	credits.forEach((c) => {
		if (c.employee_id) {
			if (!deductionsById[c.employee_id]) {
				deductionsById[c.employee_id] = [];
			}
			deductionsById[c.employee_id].push(c);
		} else {
			const key = c.employee_name.trim().toLowerCase();
			if (!deductionsByName[key]) {
				deductionsByName[key] = [];
			}
			deductionsByName[key].push(c);
		}
	});

	const payrollCards = employees.map((emp) => {
		const empCredits = deductionsById[emp.id]
			? [...deductionsById[emp.id]]
			: [];

		// Fallback for un-migrated historical credits that match by name
		const nameKey = emp.name.trim().toLowerCase();
		if (deductionsByName[nameKey]) {
			empCredits.push(...deductionsByName[nameKey]);
			delete deductionsByName[nameKey]; // Remove so they don't appear in unlinked
		}

		const totalDeducted = empCredits.reduce((sum, c) => sum + c.amount, 0);
		const netPayable = emp.base_salary - totalDeducted;

		return {
			emp,
			credits: empCredits,
			totalDeducted,
			netPayable,
		};
	});

	// Unlinked credits (historical names not currently in active roster)
	const unlinkedKeys = Object.keys(deductionsByName);

	// Unlinked IDs (deleted employees)
	const unlinkedIds = Object.keys(deductionsById).filter(
		(id) => !employees.some((e) => e.id === id),
	);

	return (
		<div className="space-y-6">
			{/* Print Header */}
			<div className="hidden print:block mb-8 border-b pb-4">
				<h1 className="text-3xl font-bold">Payroll & Salary Slips</h1>
				<p className="text-sm text-zinc-500">
					Generated for{" "}
					{format(new Date(`${appliedStartDate}T00:00:00`), "MMM d, yyyy")} -{" "}
					{format(new Date(`${appliedEndDate}T23:59:59`), "MMM d, yyyy")}
				</p>
			</div>

			<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
				<div>
					<h2 className="text-2xl font-bold tracking-tight">
						Payroll & Salary Payout Report
					</h2>
					<p className="text-zinc-500">
						Net salary calculations and itemized IOU deductions for store staff.
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
						<Printer className="mr-2 h-4 w-4" /> Print
					</Button>
				</div>
			</div>

			{loading ? (
				<div className="flex justify-center p-12">
					<Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
				</div>
			) : (
				<>
					{/* Active Roster Payroll */}
					{payrollCards.length === 0 &&
					unlinkedKeys.length === 0 &&
					unlinkedIds.length === 0 ? (
						<Card>
							<CardContent className="p-8 text-center text-zinc-500">
								No active employees or salary deductions found in the system.
							</CardContent>
						</Card>
					) : (
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
							{payrollCards.map(
								({ emp, credits: empCredits, totalDeducted, netPayable }) => (
									<Card
										key={emp.id}
										className="print:break-inside-avoid shadow-sm"
									>
										<CardHeader className="pb-3 border-b bg-zinc-50/50">
											<div className="flex justify-between items-start">
												<div>
													<CardTitle className="text-lg font-bold text-zinc-900">
														{emp.name}
													</CardTitle>
													<CardDescription className="text-xs mt-0.5">
														{emp.position}
													</CardDescription>
												</div>
												<span className="text-xs px-2.5 py-0.5 rounded-full bg-zinc-100 font-medium text-zinc-700">
													{emp.break_day
														? `Rest: ${emp.break_day}`
														: "Flexible Rest"}
												</span>
											</div>
											<div className="text-xs text-zinc-400 mt-2">
												Hired:{" "}
												{emp.hired_date
													? format(new Date(emp.hired_date), "MMM d, yyyy")
													: "N/A"}
											</div>
										</CardHeader>

										<CardContent className="pt-4 space-y-4">
											{/* Financial Summary Box */}
											<div className="bg-zinc-50 p-3 rounded-lg border space-y-1.5 text-sm">
												<div className="flex justify-between text-zinc-600">
													<span>Base Salary</span>
													<span className="font-medium">
														${emp.base_salary.toFixed(2)}
													</span>
												</div>
												<div className="flex justify-between text-red-600">
													<span>IOU Deductions</span>
													<span className="font-medium">
														-${totalDeducted.toFixed(2)}
													</span>
												</div>
												<div className="border-t pt-1.5 flex justify-between font-bold text-base">
													<span className="text-zinc-900">Net Payable</span>
													<span
														className={
															netPayable >= 0
																? "text-emerald-600"
																: "text-red-600"
														}
													>
														${netPayable.toFixed(2)}
													</span>
												</div>
											</div>

											{/* Deduction History */}
											<div>
												<div className="text-xs font-semibold uppercase text-zinc-500 mb-2 flex items-center gap-1">
													<Receipt className="h-3.5 w-3.5" /> Deduction History
													({empCredits.length})
												</div>
												{empCredits.length === 0 ? (
													<div className="text-xs text-zinc-400 italic py-1">
														No IOUs deducted this period.
													</div>
												) : (
													<div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
														{empCredits
															.sort(
																(a, b) =>
																	new Date(b.date).getTime() -
																	new Date(a.date).getTime(),
															)
															.map((c) => (
																<div
																	key={c.id}
																	className="flex justify-between text-xs p-1.5 bg-red-50/50 rounded border border-red-100"
																>
																	<span className="text-zinc-600">
																		{format(new Date(c.date), "MMM d, yyyy")}
																	</span>
																	<span className="font-semibold text-red-600">
																		-${c.amount.toFixed(2)}
																	</span>
																</div>
															))}
													</div>
												)}
											</div>
										</CardContent>
									</Card>
								),
							)}

							{/* Unlinked Historical Deductions (By Name) */}
							{unlinkedKeys.map((key) => {
								const unlinkedCredits = deductionsByName[key];
								const nameStr = unlinkedCredits[0]?.employee_name || key;
								const total = unlinkedCredits.reduce(
									(sum, c) => sum + c.amount,
									0,
								);
								return (
									<Card
										key={key}
										className="print:break-inside-avoid border-amber-200 bg-amber-50/30"
									>
										<CardHeader className="pb-3 border-b">
											<div className="flex justify-between items-center">
												<CardTitle className="text-lg font-bold text-amber-900">
													{nameStr}
												</CardTitle>
												<span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-medium">
													Former / Unregistered
												</span>
											</div>
											<CardDescription className="text-xs">
												Historical IOUs not linked to an active roster member.
											</CardDescription>
										</CardHeader>
										<CardContent className="pt-4 space-y-4">
											<div className="flex justify-between items-center text-sm p-3 bg-white rounded-md border border-amber-200">
												<span className="text-zinc-600 font-medium">
													Total Deducted
												</span>
												<span className="text-lg font-bold text-red-600">
													-${total.toFixed(2)}
												</span>
											</div>
											<div className="space-y-1.5">
												{unlinkedCredits.map((c) => (
													<div
														key={c.id}
														className="flex justify-between text-xs p-1.5 bg-white rounded border"
													>
														<span className="text-zinc-600">
															{format(new Date(c.date), "MMM d, yyyy")}
														</span>
														<span className="font-semibold text-red-600">
															-${c.amount.toFixed(2)}
														</span>
													</div>
												))}
											</div>
										</CardContent>
									</Card>
								);
							})}

							{/* Unlinked Historical Deductions (By ID - Deleted Employees) */}
							{unlinkedIds.map((id) => {
								const unlinkedCredits = deductionsById[id];
								const nameStr = unlinkedCredits[0]?.employee_name || "Unknown";
								const total = unlinkedCredits.reduce(
									(sum, c) => sum + c.amount,
									0,
								);
								return (
									<Card
										key={id}
										className="print:break-inside-avoid border-amber-200 bg-amber-50/30"
									>
										<CardHeader className="pb-3 border-b">
											<div className="flex justify-between items-center">
												<CardTitle className="text-lg font-bold text-amber-900">
													{nameStr}
												</CardTitle>
												<span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-medium">
													Former Employee
												</span>
											</div>
											<CardDescription className="text-xs">
												IOUs for a deleted or inactive employee.
											</CardDescription>
										</CardHeader>
										<CardContent className="pt-4 space-y-4">
											<div className="flex justify-between items-center text-sm p-3 bg-white rounded-md border border-amber-200">
												<span className="text-zinc-600 font-medium">
													Total Deducted
												</span>
												<span className="text-lg font-bold text-red-600">
													-${total.toFixed(2)}
												</span>
											</div>
											<div className="space-y-1.5">
												{unlinkedCredits.map((c) => (
													<div
														key={c.id}
														className="flex justify-between text-xs p-1.5 bg-white rounded border"
													>
														<span className="text-zinc-600">
															{format(new Date(c.date), "MMM d, yyyy")}
														</span>
														<span className="font-semibold text-red-600">
															-${c.amount.toFixed(2)}
														</span>
													</div>
												))}
											</div>
										</CardContent>
									</Card>
								);
							})}
						</div>
					)}
				</>
			)}
		</div>
	);
}
