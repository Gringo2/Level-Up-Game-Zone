import type { Expense, ExpenseCategory } from "@level-up/shared";
import { EXPENSE_CATEGORY_FALLBACKS, ROLES } from "@level-up/shared";
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
import { API_BASE, authFetch, safeJson } from "../lib/api";
import { getShopEndOfDay, getShopStartOfDay } from "../lib/dateUtils";
import {
	groupLogsByDay,
	HISTORY_PAGE_SIZE,
	historyPageBounds,
} from "../lib/history";

export function Expenses() {
	const { user } = useAuth();
	const [itemName, setItemName] = useState("");
	const [description, setDescription] = useState("");
	const [amount, setAmount] = useState("");
	const [category, setCategory] = useState("");
	const [quantity, setQuantity] = useState("");
	const [unitPrice, setUnitPrice] = useState("");
	const [unit, setUnit] = useState("");
	const [entryDate, setEntryDate] = useState(() =>
		new Date().toISOString().slice(0, 10),
	);
	const [loading, setLoading] = useState(false);
	const [expenses, setExpenses] = useState<Expense[]>([]);
	const [historyPage, setHistoryPage] = useState(0);
	const [allCategories, setAllCategories] = useState<ExpenseCategory[]>([]);
	const categories = allCategories.filter((c) => c.isActive);
	const [editingId, setEditingId] = useState<string | null>(null);
	const [deletingId, setDeletingId] = useState<string | null>(null);
	const [editReason, setEditReason] = useState("");
	const [deleteReason, setDeleteReason] = useState("");
	const [filterDateFrom, setFilterDateFrom] = useState(() =>
		new Date().toISOString().slice(0, 10),
	);
	const [filterDateTo, setFilterDateTo] = useState(() =>
		new Date().toISOString().slice(0, 10),
	);

	useEffect(() => {
		let mounted = true;

		const loadCategories = async () => {
			try {
				const categoriesRes = await authFetch(
					`${API_BASE}/api/expense-categories`,
				);

				if (categoriesRes.ok) {
					const cats = (await safeJson(categoriesRes)) as ExpenseCategory[];
					if (mounted) {
						setAllCategories(cats);
					}
				}
			} catch (err) {
				console.error(err);
			}
		};

		void loadCategories();
		return () => {
			mounted = false;
		};
	}, []);

	useEffect(() => {
		let mounted = true;

		const loadExpenses = async () => {
			try {
				const dayStart = getShopStartOfDay(
					new Date(filterDateFrom),
				).toISOString();
				const dayEnd = getShopEndOfDay(new Date(filterDateTo)).toISOString();

				const params = new URLSearchParams();
				params.set("startDate", dayStart);
				params.set("endDate", dayEnd);

				const expensesRes = await authFetch(
					`${API_BASE}/api/expenses?${params.toString()}`,
				);

				if (!expensesRes.ok) {
					throw new Error(
						(await safeJson(expensesRes)).error || "Failed to fetch expenses",
					);
				}

				const data = (await safeJson(expensesRes)) as Expense[];

				if (mounted) {
					setExpenses(data);
					setHistoryPage(0);
				}
			} catch (err) {
				console.error(err);
				if (mounted) {
					toast.error("Failed to load expenses");
				}
			}
		};

		void loadExpenses();

		const handleVisibility = () => {
			if (document.visibilityState === "visible") {
				void loadExpenses();
			}
		};
		document.addEventListener("visibilitychange", handleVisibility);

		return () => {
			mounted = false;
			document.removeEventListener("visibilitychange", handleVisibility);
		};
	}, [filterDateFrom, filterDateTo]);

	useEffect(() => {
		if (
			!editingId &&
			categories.length > 0 &&
			!categories.some((c) => c.name === category)
		) {
			setCategory(categories[0].name);
		}
	}, [categories, editingId, category]);

	const handleEdit = (expense: Expense) => {
		setEditingId(expense.id);
		setItemName(expense.item_name || "");
		setDescription(expense.description);
		setAmount(expense.amount.toString());
		setCategory(expense.category || categories[0]?.name || "");
		setEntryDate(new Date(expense.date).toISOString().slice(0, 10));
		setQuantity(expense.quantity?.toString() ?? "");
		setUnitPrice(expense.unit_price?.toString() ?? "");
		setUnit(expense.unit || "");
		window.scrollTo({ top: 0, behavior: "smooth" });
	};

	const cancelEdit = () => {
		setEditingId(null);
		setItemName("");
		setDescription("");
		setAmount("");
		setCategory(categories[0]?.name || "");
		setEntryDate(new Date().toISOString().slice(0, 10));
		setQuantity("");
		setUnitPrice("");
		setUnit("");
		setEditReason("");
	};

	const handleDelete = async (id: string) => {
		if (!deleteReason || !user) {
			toast.error("Please provide a reason for deletion.");
			return;
		}
		try {
			const response = await authFetch(`${API_BASE}/api/expenses/${id}`, {
				method: "DELETE",
				headers: {
					"Content-Type": "application/json",
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
			const response = await authFetch(
				`${API_BASE}/api/expenses/${id}/verify`,
				{
					method: "PUT",
				},
			);
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
		if (!itemName || !description || !amount || !user) return;

		setLoading(true);
		try {
			if (editingId) {
				if (!editReason) {
					toast.error("Please provide a reason for editing.");
					setLoading(false);
					return;
				}
				const body: Record<string, unknown> = {
					item_name: itemName,
					description: description,
					amount: amount,
					category: category,
					editReason,
				};
				if (quantity) body.quantity = parseFloat(quantity);
				if (unitPrice) body.unit_price = parseFloat(unitPrice);
				if (unit) body.unit = unit;

				const response = await authFetch(
					`${API_BASE}/api/expenses/${editingId}`,
					{
						method: "PUT",
						headers: {
							"Content-Type": "application/json",
						},
						body: JSON.stringify(body),
					},
				);
				if (!response.ok)
					throw new Error(
						(await safeJson(response)).error || "Failed to update",
					);
				const updated = await safeJson<Expense>(response);
				toast.success("Expense updated successfully!");
				setExpenses((prev) =>
					prev.map((e) => (e.id === editingId ? updated : e)),
				);
				cancelEdit();
			} else {
				const body: Record<string, unknown> = {
					item_name: itemName,
					description: description,
					amount: amount,
					category: category,
					date: new Date(entryDate).toISOString(),
				};
				if (quantity) body.quantity = parseFloat(quantity);
				if (unitPrice) body.unit_price = parseFloat(unitPrice);
				if (unit) body.unit = unit;

				const response = await authFetch(`${API_BASE}/api/expenses`, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify(body),
				});
				if (!response.ok)
					throw new Error(
						(await safeJson(response)).error || "Failed to log expense",
					);
				const newExpense = await safeJson<Expense>(response);
				setExpenses((prev) => [newExpense, ...prev]);
				setItemName("");
				setDescription("");
				setAmount("");
				setCategory(categories[0]?.name || "");
				setQuantity("");
				setUnitPrice("");
				setUnit("");
				toast.success("Expense logged successfully!");
			}
		} catch (err: unknown) {
			console.error(err);
			toast.error("Failed to save expense");
		} finally {
			setLoading(false);
		}
	};

	const bounds = historyPageBounds(expenses.length);
	const safeHistoryPage = bounds.clamp(historyPage);
	const pageItems = expenses.slice(...bounds.slice(safeHistoryPage));
	const dayByKey = new Map(
		groupLogsByDay(expenses, (log) => log.amount).map(
			(g) => [g.key, g] as const,
		),
	);

	return (
		<div className="space-y-6">
			<h2 className="text-2xl font-bold tracking-tight">Log Expenses</h2>
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				<Card className="lg:col-span-1 h-fit">
					<form onSubmit={handleSubmit}>
						<CardHeader>
							<CardTitle>
								{editingId ? "Edit Expense" : "New Expense"}
							</CardTitle>
							<CardDescription>
								Log a daily expense. This will be deducted from the expected
								cash.
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
								<Label htmlFor="itemName">Item Name</Label>
								<Input
									id="itemName"
									type="text"
									value={itemName}
									onChange={(e) => setItemName(e.target.value)}
									placeholder="e.g., Paper Towels, Light Bulbs"
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
									{categories.length > 0
										? categories.map((cat) => (
												<option key={cat.id} value={cat.name}>
													{cat.name}
												</option>
											))
										: EXPENSE_CATEGORY_FALLBACKS.map((cat) => (
												<option key={cat} value={cat}>
													{cat}
												</option>
											))}
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
									placeholder="Enter directly or compute from quantity × unit price"
								/>
							</div>
							<div className="grid grid-cols-3 gap-2">
								<div className="space-y-2">
									<Label htmlFor="quantity">Qty</Label>
									<Input
										id="quantity"
										type="number"
										step="1"
										min="1"
										value={quantity}
										onChange={(e) => {
											setQuantity(e.target.value);
											if (e.target.value && unitPrice) {
												setAmount(
													(
														parseFloat(e.target.value) * parseFloat(unitPrice)
													).toFixed(2),
												);
											}
										}}
										placeholder="Optional"
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="unitPrice">Unit Price ($)</Label>
									<Input
										id="unitPrice"
										type="number"
										step="0.01"
										min="0.01"
										value={unitPrice}
										onChange={(e) => {
											setUnitPrice(e.target.value);
											if (quantity && e.target.value) {
												setAmount(
													(
														parseFloat(quantity) * parseFloat(e.target.value)
													).toFixed(2),
												);
											}
										}}
										placeholder="Optional"
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="unit">Unit</Label>
									<Input
										id="unit"
										type="text"
										value={unit}
										onChange={(e) => setUnit(e.target.value)}
										placeholder="e.g., hrs, gal"
									/>
								</div>
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
									!itemName ||
									!description ||
									(!amount && (!quantity || !unitPrice)) ||
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

				<Card className="lg:col-span-2">
					<CardHeader>
						<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
							<div>
								<CardTitle>Expenses</CardTitle>
								<CardDescription>
									{filterDateFrom === filterDateTo
										? `Expenses for ${filterDateFrom}`
										: `Expenses from ${filterDateFrom} to ${filterDateTo}`}
								</CardDescription>
							</div>
							<div className="flex items-center gap-2">
								<div className="flex items-center gap-1">
									<Label htmlFor="filterFrom" className="text-xs text-zinc-500">
										From
									</Label>
									<Input
										id="filterFrom"
										type="date"
										value={filterDateFrom}
										onChange={(e) => setFilterDateFrom(e.target.value)}
										className="h-8 w-[150px] text-xs"
									/>
								</div>
								<div className="flex items-center gap-1">
									<Label htmlFor="filterTo" className="text-xs text-zinc-500">
										To
									</Label>
									<Input
										id="filterTo"
										type="date"
										value={filterDateTo}
										onChange={(e) => setFilterDateTo(e.target.value)}
										className="h-8 w-[150px] text-xs"
									/>
								</div>
							</div>
						</div>
					</CardHeader>
					<CardContent>
						{expenses.length > 0 && (
							<div
								className="mb-3 flex items-center justify-between rounded-md bg-zinc-50 px-3 py-2 border"
								data-testid="expenses-range-summary"
							>
								<span className="text-sm font-medium text-zinc-600">
									{expenses.length}{" "}
									{expenses.length === 1 ? "expense" : "expenses"}
								</span>
								<span className="text-base font-semibold text-zinc-900">
									Total $
									{expenses.reduce((sum, e) => sum + e.amount, 0).toFixed(2)}
								</span>
							</div>
						)}
						<div>
							{expenses.length === 0 ? (
								<div className="text-center text-zinc-500 py-8">
									No expenses found for the selected date range.
								</div>
							) : (
								<div className="rounded-md border bg-white divide-y">
									{pageItems.map((expense, idx) => {
										const d = new Date(expense.date);
										const key = format(d, "yyyy-MM-dd");
										const prevKey =
											idx > 0
												? format(
														new Date(pageItems[idx - 1].date),
														"yyyy-MM-dd",
													)
												: null;
										const group = dayByKey.get(key);
										return (
											<div key={expense.id}>
												{key !== prevKey && group && (
													<div className="flex items-center px-3 py-1 bg-zinc-50 text-xs font-medium text-zinc-600 border-b">
														<span className="font-medium">{group.label}</span>
													</div>
												)}
												<div className="flex items-center gap-2 px-3 py-1.5 text-sm flex-wrap">
													<span className="font-medium shrink-0">
														{expense.item_name || expense.description}
													</span>
													<span className="text-zinc-500">
														${expense.amount.toFixed(2)} &bull;{" "}
														{expense.category || "Misc"}
														{expense.quantity && expense.unit_price && (
															<>
																{" "}
																&bull; {expense.quantity} × $
																{expense.unit_price.toFixed(2)}
																{expense.unit ? `/${expense.unit}` : ""}
															</>
														)}
													</span>
													{expense.item_name && expense.description && (
														<span className="text-xs text-zinc-400 truncate max-w-[12rem] hidden md:inline">
															{expense.description}
														</span>
													)}
													<span className="text-zinc-400 tabular-nums w-16 shrink-0">
														{format(d, "h:mm a")}
													</span>
													{expense.user_name && (
														<span className="text-zinc-500 truncate max-w-[10rem]">
															{expense.user_name}
														</span>
													)}
													{expense.verified ? (
														<span className="text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-sm text-xs">
															Verified
														</span>
													) : (
														<span className="text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-sm text-xs">
															Unverified
														</span>
													)}
													{(user?.role === ROLES.MANAGER ||
														user?.role === ROLES.ADMIN) && (
														<div className="ml-auto flex items-center gap-2">
															{!expense.verified && (
																<Button
																	size="sm"
																	variant="outline"
																	className="text-emerald-600 border-emerald-200 hover:bg-emerald-50"
																	onClick={() => handleVerify(expense.id)}
																>
																	Verify
																</Button>
															)}
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
														</div>
													)}
												</div>
											</div>
										);
									})}
								</div>
							)}
							{expenses.length > HISTORY_PAGE_SIZE && (
								<div className="flex items-center justify-between mt-3 text-sm">
									<Button
										type="button"
										variant="outline"
										size="sm"
										onClick={() => setHistoryPage((p) => Math.max(0, p - 1))}
										disabled={safeHistoryPage === 0}
									>
										Previous
									</Button>
									<span className="text-zinc-500">
										Page {safeHistoryPage + 1} of {bounds.pageCount}
									</span>
									<Button
										type="button"
										variant="outline"
										size="sm"
										onClick={() =>
											setHistoryPage((p) =>
												Math.min(bounds.pageCount - 1, p + 1),
											)
										}
										disabled={safeHistoryPage >= bounds.pageCount - 1}
									>
										Next
									</Button>
								</div>
							)}
						</div>
					</CardContent>
				</Card>
			</div>

			<ConfirmDialog
				open={!!deletingId}
				title="Delete Expense"
				message="Are you sure you want to delete this expense? This action cannot be undone."
				reasonValue={deleteReason}
				onReasonChange={setDeleteReason}
				requireReason
				confirmLabel="Confirm Delete"
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
