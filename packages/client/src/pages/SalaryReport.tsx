import type { Credit } from "@level-up/shared";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "../components/ui/card";
import { auth } from "../firebase";

export function SalaryReport() {
	const [credits, setCredits] = useState<Credit[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		let mounted = true;

		const loadSalaryDeductions = async () => {
			try {
				const token = await auth.currentUser?.getIdToken();
				if (!token) throw new Error("Not authenticated");

				const response = await fetch(
					`http://${window.location.hostname}:4000/api/credits`,
					{
						headers: {
							Authorization: `Bearer ${token}`,
						},
					},
				);
				if (!response.ok) {
					throw new Error(
						(await response.json()).error || "Failed to fetch deductions",
					);
				}

				const data = (await response.json()) as Credit[];
				if (mounted) {
					setCredits(data.filter((credit) => credit.status === "Deducted"));
					setLoading(false);
				}
			} catch (err) {
				console.error(err);
				if (mounted) {
					toast.error("Failed to load salary deductions");
					setLoading(false);
				}
			}
		};

		void loadSalaryDeductions();
		return () => {
			mounted = false;
		};
	}, []);

	const groupedByEmployee = credits.reduce(
		(acc, credit) => {
			if (!acc[credit.employee_name]) {
				acc[credit.employee_name] = [];
			}
			acc[credit.employee_name].push(credit);
			return acc;
		},
		{} as Record<string, Credit[]>,
	);

	const employees = Object.keys(groupedByEmployee).sort();

	return (
		<div className="space-y-6">
			<h2 className="text-2xl font-bold tracking-tight">
				Salary Deductions Report
			</h2>
			<p className="text-zinc-500">
				Overview of all IOUs marked for salary deduction.
			</p>

			{loading ? (
				<div className="flex justify-center p-8">
					<Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
				</div>
			) : employees.length === 0 ? (
				<Card>
					<CardContent className="p-8 text-center text-zinc-500">
						No salary deductions found.
					</CardContent>
				</Card>
			) : (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
					{employees.map((emp) => {
						const empCredits = groupedByEmployee[emp];
						const totalDeduction = empCredits.reduce(
							(sum, c) => sum + c.amount,
							0,
						);
						return (
							<Card key={emp}>
								<CardHeader className="pb-2">
									<CardTitle className="text-lg">{emp}</CardTitle>
									<CardDescription>Total Deductions</CardDescription>
								</CardHeader>
								<CardContent>
									<div className="text-3xl font-bold text-red-600 mb-4">
										${totalDeduction.toFixed(2)}
									</div>
									<div className="space-y-2">
										<div className="text-sm font-medium text-zinc-500 border-b pb-1">
											Deduction History
										</div>
										{empCredits
											.sort(
												(a, b) =>
													new Date(b.date).getTime() -
													new Date(a.date).getTime(),
											)
											.map((c) => (
												<div
													key={c.id}
													className="flex justify-between text-sm"
												>
													<span className="text-zinc-600">
														{format(new Date(c.date), "MMM d, yyyy")}
													</span>
													<span className="font-medium">
														${c.amount.toFixed(2)}
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
		</div>
	);
}
