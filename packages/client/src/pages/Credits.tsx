import type { Credit, Employee } from "@level-up/shared";
import { CREDIT_STATUSES } from "@level-up/shared";
import { format } from "date-fns";
import { Edit2, Loader2, Trash2 } from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "../components/ui/card";
import { ConfirmDialog } from "../components/ui/confirm-dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { useAuth } from "../contexts/AuthContext";
import { auth } from "../firebase";
import { API_BASE, safeJson } from "../lib/api";

export function Credits() {
	const { user } = useAuth();
	const [employeeId, setEmployeeId] = useState("");
	const [employeeName, setEmployeeName] = useState("");
	const [amount, setAmount] = useState("");
	const [entryDate, setEntryDate] = useState(() =>
		new Date().toISOString().slice(0, 10),
	);
	const [loading, setLoading] = useState(false);
	const [credits, setCredits] = useState<Credit[]>([]);
	const [employeeRoster, setEmployeeRoster] = useState<Employee[]>([]);
	const [editingId, setEditingId] = useState<string | null>(null);
	const [deletingId, setDeletingId] = useState<string | null>(null);
	const [editReason, setEditReason] = useState("");
	const [deleteReason, setDeleteReason] = useState("");

	useEffect(() => {
		let mounted = true;

		const loadCredits = async () => {
			try {
				const token = await auth.currentUser?.getIdToken();
				if (!token) throw new Error("Not authenticated");

				const [creditsResponse, employeesResponse] = await Promise.all([
					fetch(`${API_BASE}/api/credits`, {
						headers: {
							Authorization: `Bearer ${token}`,
						},
					}),
					fetch(`${API_BASE}/api/employees`, {
						headers: {
							Authorization: `Bearer ${token}`,
						},
					}),
				]);

				if (!creditsResponse.ok) {
					throw new Error("Failed to fetch credits");
				}

				const data = (await safeJson(creditsResponse)) as Credit[];
				const empData = employeesResponse.ok
					? ((await safeJson(employeesResponse)) as Employee[])
					: [];

				if (mounted) {
					setCredits(
						data.sort(
							(a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
						),
					);
					setEmployeeRoster(empData.filter((e) => e.isActive));
				}
			} catch (err) {
				console.error(err);
				if (mounted) {
					toast.error("Failed to load credits");
				}
			}
		};

		void loadCredits();
		return () => {
			mounted = false;
		};
	}, []);

	const handleResolve = async (
		id: string,
		resolution:
			| typeof CREDIT_STATUSES.RESOLVED
			| typeof CREDIT_STATUSES.DEDUCTED,
	) => {
		try {
			const token = await auth.currentUser?.getIdToken();
			if (!token) throw new Error("Not authenticated");

			const response = await fetch(`${API_BASE}/api/credits/${id}`, {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({
					status: resolution,
					editReason: `Status updated to ${resolution}`,
				}),
			});
			if (!response.ok)
				throw new Error(
					(await safeJson(response)).error || "Failed to update status",
				);

			toast.success(`Credit marked as ${resolution}`);
			setCredits((prev) =>
				prev.map((c) => (c.id === id ? { ...c, status: resolution } : c)),
			);
		} catch (err: unknown) {
			console.error(err);
			toast.error(`Failed to mark credit as ${resolution}`);
		}
	};

	const handleEdit = (credit: Credit) => {
		setEditingId(credit.id);
		setEmployeeId(credit.employee_id || "");
		setEmployeeName(credit.employee_name);
		setAmount(credit.amount.toString());
		window.scrollTo({ top: 0, behavior: "smooth" });
	};

	const cancelEdit = () => {
		setEditingId(null);
		setEmployeeId("");
		setEmployeeName("");
		setAmount("");
		setEditReason("");
	};

	const handleDelete = async (id: string) => {
		if (!deleteReason || !user) {
			toast.error("Please provide a reason for deletion.");
			return;
		}
		try {
			const token = await auth.currentUser?.getIdToken();
			if (!token) throw new Error("Not authenticated");

			const response = await fetch(`${API_BASE}/api/credits/${id}`, {
				method: "DELETE",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({ deleteReason }),
			});
			if (!response.ok)
				throw new Error((await safeJson(response)).error || "Failed to delete");

			toast.success("Credit deleted successfully!");
			setCredits((prev) => prev.filter((c) => c.id !== id));
			setDeletingId(null);
			setDeleteReason("");
		} catch (err: unknown) {
			console.error(err);
			toast.error("Failed to delete credit");
		}
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!employeeName || !employeeId || !amount || !user) return;

		setLoading(true);
		try {
			const token = await auth.currentUser?.getIdToken();
			if (!token) throw new Error("Not authenticated");

			if (editingId) {
				if (!editReason) {
					toast.error("Please provide a reason for editing.");
					setLoading(false);
					return;
				}
				const response = await fetch(`${API_BASE}/api/credits/${editingId}`, {
					method: "PUT",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${token}`,
					},
					body: JSON.stringify({
						employee_id: employeeId,
						employee_name: employeeName,
						amount: amount,
						editReason,
					}),
				});
				if (!response.ok)
					throw new Error(
						(await safeJson(response)).error || "Failed to update",
					);
				const updated = await safeJson<Credit>(response);
				toast.success("Credit updated successfully!");
				setCredits((prev) =>
					prev.map((c) => (c.id === editingId ? updated : c)),
				);
				cancelEdit();
			} else {
				const response = await fetch(`${API_BASE}/api/credits`, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${token}`,
					},
					body: JSON.stringify({
						employee_id: employeeId,
						employee_name: employeeName,
						amount: amount,
						date: new Date(entryDate).toISOString(),
					}),
				});
				if (!response.ok)
					throw new Error(
						(await safeJson(response)).error || "Failed to log credit",
					);
				const newCredit = await safeJson<Credit>(response);
				setCredits((prev) => [newCredit, ...prev]);
				setEmployeeId("");
				setEmployeeName("");
				setAmount("");
				toast.success("Credit logged successfully!");
			}
		} catch (err: unknown) {
			console.error(err);
			toast.error("Failed to save credit");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="space-y-6">
			<h2 className="text-2xl font-bold tracking-tight">Log Credits (IOUs)</h2>

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				<Card className="lg:col-span-1 h-fit">
					<form onSubmit={handleSubmit}>
						<CardHeader>
							<CardTitle>New Credit</CardTitle>
							<CardDescription>
								Log an IOU for an employee. This will be deducted from the
								expected cash.
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="space-y-2">
								<Label htmlFor="entryDate">Date</Label>
								<Input
									id="entryDate"
									type="date"
									value={entryDate}
									onChange={(e) => setEntryDate(e.target.value)}
									required
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="employee">Employee Name</Label>
								{employeeRoster.length > 0 ? (
									<select
										id="employee"
										value={employeeId}
										onChange={(e) => {
											const selectedId = e.target.value;
											const selectedEmp = employeeRoster.find(
												(emp) => emp.id === selectedId,
											);
											if (selectedEmp) {
												setEmployeeId(selectedEmp.id);
												setEmployeeName(selectedEmp.name);
											}
										}}
										className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950"
										required
									>
										<option value="" disabled>
											Select an employee...
										</option>
										{employeeRoster.map((emp) => (
											<option key={emp.id} value={emp.id}>
												{emp.name} ({emp.position})
											</option>
										))}
									</select>
								) : (
									<div className="text-sm text-zinc-500 italic">
										Employee roster empty. Please add employees first.
									</div>
								)}
							</div>
							<div className="space-y-2">
								<Label htmlFor="amount">Amount ($)</Label>
								<Input
									id="amount"
									type="number"
									step="0.01"
									min="0.01"
									value={amount}
									onChange={(e) => setAmount(e.target.value)}
									required
								/>
							</div>
							{editingId && (
								<div className="space-y-2">
									<Label htmlFor="editReason" className="text-amber-600">
										Reason for Edit (Required)
									</Label>
									<Input
										id="editReason"
										type="text"
										value={editReason}
										onChange={(e) => setEditReason(e.target.value)}
										required
										placeholder="e.g., Wrong amount entered"
									/>
								</div>
							)}
						</CardContent>
						<CardFooter className="flex gap-2">
							<Button
								type="submit"
								className="flex-1"
								disabled={
									loading ||
									!employeeName ||
									!amount ||
									(!!editingId && !editReason)
								}
							>
								{loading ? (
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								) : null}
								{editingId ? "Update Credit" : "Log Credit"}
							</Button>
							{editingId && (
								<Button type="button" variant="outline" onClick={cancelEdit}>
									Cancel
								</Button>
							)}
						</CardFooter>
					</form>
				</Card>

				<Card className="lg:col-span-2">
					<CardHeader>
						<CardTitle>Recent Credits</CardTitle>
						<CardDescription>Manage employee IOUs.</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="space-y-3">
							{credits.length === 0 ? (
								<div className="text-center text-zinc-500 py-8">
									No credits logged yet.
								</div>
							) : (
								credits.map((credit) => (
									<div
										key={credit.id}
										className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 border rounded-md bg-white gap-3"
									>
										<div>
											<div className="font-medium">{credit.employee_name}</div>
											<div className="text-sm text-zinc-500">
												${credit.amount.toFixed(2)}
											</div>
											<div className="text-xs text-zinc-400 mt-1">
												{format(new Date(credit.date), "MMM d, h:mm a")}
												{credit.user_name && <> &bull; {credit.user_name}</>}
											</div>
										</div>

										<div className="flex flex-col items-end gap-2">
											<div className="flex items-center gap-2">
												<span
													className={`text-xs font-semibold px-2 py-1 rounded-full ${
														credit.status === CREDIT_STATUSES.PENDING
															? "bg-amber-100 text-amber-800"
															: credit.status === CREDIT_STATUSES.RESOLVED
																? "bg-emerald-100 text-emerald-800"
																: "bg-zinc-100 text-zinc-800"
													}`}
												>
													{credit.status}
												</span>
												{credit.resolved_date && (
													<span className="text-xs text-zinc-400">
														{format(
															new Date(credit.resolved_date),
															"MMM d, h:mm a",
														)}
													</span>
												)}
												{deletingId === credit.id ? null : (
													<>
														<Button
															size="icon"
															variant="ghost"
															className="h-6 w-6"
															onClick={() => handleEdit(credit)}
															disabled={!!editingId}
														>
															<Edit2 className="h-3 w-3" />
														</Button>
														<Button
															size="icon"
															variant="ghost"
															className="h-6 w-6 text-red-600 hover:text-red-700 hover:bg-red-50"
															onClick={() => setDeletingId(credit.id)}
															disabled={!!editingId}
														>
															<Trash2 className="h-3 w-3" />
														</Button>
													</>
												)}
											</div>
											{credit.status === CREDIT_STATUSES.PENDING && (
												<div className="flex gap-2 mt-1">
													<Button
														size="sm"
														variant="outline"
														className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
														onClick={() =>
															handleResolve(credit.id, CREDIT_STATUSES.RESOLVED)
														}
													>
														Mark Paid
													</Button>
													<Button
														size="sm"
														variant="outline"
														className="text-zinc-600 hover:bg-zinc-50"
														onClick={() =>
															handleResolve(credit.id, CREDIT_STATUSES.DEDUCTED)
														}
													>
														Deduct
													</Button>
												</div>
											)}
										</div>
									</div>
								))
							)}
						</div>
					</CardContent>
				</Card>
			</div>

			<ConfirmDialog
				open={!!deletingId}
				title="Delete Credit"
				message="Are you sure you want to delete this credit? This action cannot be undone."
				reasonValue={deleteReason}
				onReasonChange={setDeleteReason}
				onConfirm={() => {
					if (deletingId) handleDelete(deletingId);
				}}
				onCancel={() => {
					setDeletingId(null);
					setDeleteReason("");
				}}
			/>
		</div>
	);
}
