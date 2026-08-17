import type { Expense } from "@level-up/shared";
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
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { useAuth } from "../contexts/AuthContext";
import { auth } from "../firebase";
import { API_BASE, safeJson } from "../lib/api";
import { getShopEndOfDay, getShopStartOfDay } from "../lib/dateUtils";

export function Expenses() {
	const { user } = useAuth();
	const [description, setDescription] = useState("");
	const [amount, setAmount] = useState("");
	const [category, setCategory] = useState("Misc");
	const [entryDate, setEntryDate] = useState(() =>
		new Date().toISOString().slice(0, 10),
	);
	const [loading, setLoading] = useState(false);
	const [expenses, setExpenses] = useState<Expense[]>([]);
	const [editingId, setEditingId] = useState<string | null>(null);
	const [deletingId, setDeletingId] = useState<string | null>(null);
	const [editReason, setEditReason] = useState("");
	const [deleteReason, setDeleteReason] = useState("");

	useEffect(() => {
		let mounted = true;

		const loadExpenses = async () => {
			try {
				const token = await auth.currentUser?.getIdToken();
				if (!token) throw new Error("Not authenticated");

				const response = await fetch(`${API_BASE}/api/expenses`, {
					headers: {
						Authorization: `Bearer ${token}`,
					},
				});
				if (!response.ok) {
					throw new Error(
						(await safeJson(response)).error || "Failed to fetch expenses",
					);
				}

				const dayStart = getShopStartOfDay().toISOString();
				const dayEnd = getShopEndOfDay().toISOString();
				const data = (await safeJson(response)) as Expense[];
				const fetched = data
					.filter(
						(expense) => expense.date >= dayStart && expense.date <= dayEnd,
					)
					.sort(
						(a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
					);

				if (mounted) {
					setExpenses(fetched);
				}
			} catch (err) {
				console.error(err);
				if (mounted) {
					toast.error("Failed to load expenses");
				}
			}
		};

		void loadExpenses();
		return () => {
			mounted = false;
		};
	}, []);

	const handleEdit = (expense: Expense) => {
		setEditingId(expense.id);
		setDescription(expense.description);
		setAmount(expense.amount.toString());
		setCategory(expense.category || "Misc");
		window.scrollTo({ top: 0, behavior: "smooth" });
	};

	const cancelEdit = () => {
		setEditingId(null);
		setDescription("");
		setAmount("");
		setCategory("Misc");
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

			const response = await fetch(`${API_BASE}/api/expenses/${id}`, {
				method: "DELETE",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({ deleteReason }),
			});
			if (!response.ok)
				throw new Error((await safeJson(response)).error || "Failed to delete");

			toast.success("Expense deleted successfully!");
			setExpenses((prev) => prev.filter((e) => e.id !== id));
			setDeletingId(null);
			setDeleteReason("");
		} catch (err: unknown) {
			console.error(err);
			toast.error("Failed to delete expense");
		}
	};

	const handleVerify = async (id: string) => {
		try {
			const token = await auth.currentUser?.getIdToken();
			if (!token) throw new Error("Not authenticated");

			const response = await fetch(`${API_BASE}/api/expenses/${id}/verify`, {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
			});
			if (!response.ok)
				throw new Error((await safeJson(response)).error || "Failed to verify");

			toast.success("Expense verified!");
			setExpenses((prev) =>
				prev.map((e) => (e.id === id ? { ...e, verified: true } : e)),
			);
		} catch (err: unknown) {
			console.error(err);
			toast.error("Failed to verify expense");
		}
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!description || !amount || !user) return;

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
				const response = await fetch(`${API_BASE}/api/expenses/${editingId}`, {
					method: "PUT",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${token}`,
					},
					body: JSON.stringify({
						description: description,
						amount: amount,
						category: category,
						editReason,
					}),
				});
				if (!response.ok)
					throw new Error(
						(await safeJson(response)).error || "Failed to update",
					);
				toast.success("Expense updated successfully!");
				setExpenses((prev) =>
					prev.map((e) =>
						e.id === editingId
							? {
									...e,
									description: description,
									amount: parseFloat(amount),
									category: category,
								}
							: e,
					),
				);
				cancelEdit();
			} else {
				const response = await fetch(`${API_BASE}/api/expenses`, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${token}`,
					},
					body: JSON.stringify({
						description: description,
						amount: amount,
						category: category,
						date: new Date(entryDate).toISOString(),
					}),
				});
				if (!response.ok)
					throw new Error(
						(await safeJson(response)).error || "Failed to log expense",
					);
				const newExpense = await safeJson<Expense>(response);
				setExpenses((prev) => [newExpense, ...prev]);
				setDescription("");
				setAmount("");
				setCategory("Misc");
				toast.success("Expense logged successfully!");
			}
		} catch (err: unknown) {
			console.error(err);
			toast.error("Failed to save expense");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="space-y-6">
			<h2 className="text-2xl font-bold tracking-tight">Log Expenses</h2>
			<Card className="max-w-md">
				<form onSubmit={handleSubmit}>
					<CardHeader>
						<CardTitle>New Expense</CardTitle>
						<CardDescription>
							Log a daily expense. This will be deducted from the expected cash.
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
							<Label htmlFor="description">
								Description (e.g., Cleaning supplies)
							</Label>
							<Input
								id="description"
								type="text"
								value={description}
								onChange={(e) => setDescription(e.target.value)}
								required
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="category">Category</Label>
							<select
								id="category"
								value={category}
								onChange={(e) => setCategory(e.target.value)}
								className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
								required
							>
								<option value="Maintenance">Maintenance</option>
								<option value="Utilities">Utilities</option>
								<option value="Supplies">Supplies</option>
								<option value="Wages">Wages</option>
								<option value="Misc">Misc</option>
							</select>
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
									placeholder="e.g., Typo in amount"
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
								!description ||
								!amount ||
								(!!editingId && !editReason)
							}
						>
							{loading ? (
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
							) : null}
							{editingId ? "Update Expense" : "Log Expense"}
						</Button>
						{editingId && (
							<Button type="button" variant="outline" onClick={cancelEdit}>
								Cancel
							</Button>
						)}
					</CardFooter>
				</form>
			</Card>

			<Card className="max-w-2xl">
				<CardHeader>
					<CardTitle>Today's Expenses</CardTitle>
					<CardDescription>Recent expenses logged today.</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="space-y-3">
						{expenses.length === 0 ? (
							<div className="text-center text-zinc-500 py-8">
								No expenses logged today yet.
							</div>
						) : (
							expenses.map((expense) => (
								<div
									key={expense.id}
									className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 border rounded-md bg-white gap-3"
								>
									<div>
										<div className="font-medium">{expense.description}</div>
										<div className="text-sm text-zinc-500">
											${expense.amount.toFixed(2)} &bull;{" "}
											{expense.category || "Misc"}
										</div>
										<div className="text-xs text-zinc-400 mt-1 flex items-center gap-2">
											{format(new Date(expense.date), "h:mm a")}
											{expense.verified ? (
												<span className="text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-sm">
													Verified
												</span>
											) : (
												<span className="text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-sm">
													Unverified
												</span>
											)}
										</div>
									</div>

									<div className="flex items-center gap-2 w-full sm:w-auto">
										{deletingId === expense.id ? (
											<div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 bg-red-50 p-2 rounded-md border border-red-100 w-full sm:w-auto justify-end">
												<Input
													size={1}
													className="h-8 w-full sm:w-40 text-xs bg-white"
													placeholder="Reason for deletion..."
													value={deleteReason}
													onChange={(e) => setDeleteReason(e.target.value)}
												/>
												<div className="flex gap-1">
													<Button
														size="sm"
														variant="destructive"
														onClick={() => handleDelete(expense.id)}
														disabled={!deleteReason}
													>
														Confirm
													</Button>
													<Button
														size="sm"
														variant="ghost"
														onClick={() => {
															setDeletingId(null);
															setDeleteReason("");
														}}
													>
														Cancel
													</Button>
												</div>
											</div>
										) : (
											<>
												{!expense.verified &&
													(user?.role === "manager" ||
														user?.role === "admin") && (
														<Button
															size="sm"
															variant="outline"
															className="text-emerald-600 border-emerald-200 hover:bg-emerald-50"
															onClick={() => handleVerify(expense.id)}
														>
															Verify
														</Button>
													)}
												{(user?.role === "manager" ||
													user?.role === "admin") && (
													<>
														<Button
															size="sm"
															variant="outline"
															onClick={() => handleEdit(expense)}
															disabled={!!editingId}
														>
															<Edit2 className="h-4 w-4 mr-1" /> Edit
														</Button>
														<Button
															size="sm"
															variant="ghost"
															className="text-red-600 hover:text-red-700 hover:bg-red-50"
															onClick={() => setDeletingId(expense.id)}
															disabled={!!editingId}
														>
															<Trash2 className="h-4 w-4" />
														</Button>
													</>
												)}
											</>
										)}
									</div>
								</div>
							))
						)}
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
