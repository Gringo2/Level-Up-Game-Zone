import type { GameRate, GameSalesLog } from "@level-up/shared";
import { DEFAULT_GAME_RATES, ROLES } from "@level-up/shared";
import { format } from "date-fns";
import { Edit2, Loader2, Trash2 } from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
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

export function GameSales() {
	const { user } = useAuth();
	const [rates, setRates] = useState<GameRate[]>([]);
	const [logs, setLogs] = useState<GameSalesLog[]>([]);
	const [selectedRateId, setSelectedRateId] = useState("");
	const [quantity, setQuantity] = useState("");
	const [entryDate, setEntryDate] = useState(() =>
		new Date().toISOString().slice(0, 10),
	);
	const [loading, setLoading] = useState(false);
	const [loadingRates, setLoadingRates] = useState(true);
	const [editingId, setEditingId] = useState<string | null>(null);
	const [deletingId, setDeletingId] = useState<string | null>(null);
	const [deletePending, setDeletePending] = useState(false);
	const [historyPage, setHistoryPage] = useState(0);
	const [editReason, setEditReason] = useState("");
	const [deleteReason, setDeleteReason] = useState("");
	const [loadingDefaults, setLoadingDefaults] = useState(false);
	const todayStr = new Date().toISOString().slice(0, 10);
	const [rangeStart, setRangeStart] = useState(todayStr);
	const [rangeEnd, setRangeEnd] = useState(todayStr);

	useEffect(() => {
		let mounted = true;

		const loadRates = async () => {
			try {
				const ratesResponse = await authFetch(`${API_BASE}/api/rates`);
				if (!ratesResponse.ok) {
					throw new Error("Failed to fetch rates");
				}
				const fetchedRates = await safeJson<GameRate[]>(ratesResponse);
				if (mounted) {
					setRates(fetchedRates.filter((rate) => rate.isActive));
					setLoadingRates(false);
				}
			} catch (err: unknown) {
				console.error(err);
				if (mounted) {
					toast.error(
						err instanceof Error && err.message
							? err.message
							: "Failed to load sales data",
					);
					setLoadingRates(false);
				}
			}
		};

		void loadRates();

		return () => {
			mounted = false;
		};
	}, []);

	const loadSalesLogs = useCallback(async () => {
		try {
			const startISO = getShopStartOfDay(
				new Date(`${rangeStart}T00:00:00`),
			).toISOString();
			const endISO = getShopEndOfDay(
				new Date(`${rangeEnd}T00:00:00`),
			).toISOString();
			const salesResponse = await authFetch(
				`${API_BASE}/api/sales?startDate=${encodeURIComponent(startISO)}&endDate=${encodeURIComponent(endISO)}`,
			);
			if (!salesResponse.ok) {
				throw new Error("Failed to fetch sales logs");
			}
			const fetchedSales = await safeJson<GameSalesLog[]>(salesResponse);
			setLogs(
				fetchedSales.sort(
					(a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
				),
			);
			setHistoryPage(0);
			setLoadingRates(false);
		} catch (err: unknown) {
			console.error(err);
			toast.error(
				err instanceof Error && err.message
					? err.message
					: "Failed to load sales data",
			);
			setLoadingRates(false);
		}
	}, [rangeStart, rangeEnd]);

	useEffect(() => {
		void loadSalesLogs();

		const handleVisibility = () => {
			if (document.visibilityState === "visible") {
				void loadSalesLogs();
			}
		};
		document.addEventListener("visibilitychange", handleVisibility);

		return () => {
			document.removeEventListener("visibilitychange", handleVisibility);
		};
	}, [loadSalesLogs]);

	const selectedRate = rates.find((r) => r.id === selectedRateId);
	const calculatedTotal =
		selectedRate && quantity
			? selectedRate.price_per_unit * parseFloat(quantity)
			: 0;

	const handleEdit = (log: GameSalesLog) => {
		setEditingId(log.id);
		setSelectedRateId(log.game_id);
		setQuantity(log.quantity_sold.toString());
		window.scrollTo({ top: 0, behavior: "smooth" });
	};

	const cancelEdit = () => {
		setEditingId(null);
		setSelectedRateId("");
		setQuantity("");
		setEditReason("");
	};

	const handleDelete = async (id: string) => {
		if (!deleteReason || !user) {
			toast.error("Please provide a reason for deletion.");
			return;
		}
		setDeletePending(true);
		try {
			const response = await authFetch(`${API_BASE}/api/sales/${id}`, {
				method: "DELETE",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ deleteReason }),
			});
			if (!response.ok)
				throw new Error((await safeJson(response)).error || "Failed to delete");

			toast.success("Log deleted successfully!");
			setLogs((prev) => prev.filter((l) => l.id !== id));
			setDeletingId(null);
			setDeleteReason("");
		} catch (err: unknown) {
			console.error(err);
			toast.error(
				err instanceof Error && err.message
					? err.message
					: "Failed to delete sale",
			);
		} finally {
			setDeletePending(false);
		}
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!selectedRate || !quantity || !user) return;

		setLoading(true);
		try {
			if (editingId) {
				if (!editReason) {
					toast.error("Please provide a reason for editing.");
					setLoading(false);
					return;
				}
				const response = await authFetch(`${API_BASE}/api/sales/${editingId}`, {
					method: "PUT",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						game_id: selectedRate.id,
						game_name: selectedRate.game_name,
						quantity_sold: quantity,
						rate_applied: selectedRate.price_per_unit,
						calculated_total: calculatedTotal,
						editReason,
					}),
				});
				if (!response.ok)
					throw new Error(
						(await safeJson(response)).error || "Failed to update",
					);
				const updated = await safeJson<GameSalesLog>(response);
				toast.success("Game sale updated successfully!");
				setLogs((prev) => prev.map((l) => (l.id === editingId ? updated : l)));
				cancelEdit();
			} else {
				const response = await authFetch(`${API_BASE}/api/sales`, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						game_id: selectedRate.id,
						game_name: selectedRate.game_name,
						quantity_sold: quantity,
						rate_applied: selectedRate.price_per_unit,
						calculated_total: calculatedTotal,
						date: new Date(entryDate).toISOString(),
					}),
				});
				if (!response.ok)
					throw new Error(
						(await safeJson(response)).error || "Failed to log sale",
					);
				const newLog = await safeJson<GameSalesLog>(response);
				setLogs((prev) => [newLog, ...prev]);
				setQuantity("");
				toast.success("Game sale logged successfully!");
			}
		} catch (err: unknown) {
			console.error(err);
			toast.error(
				err instanceof Error && err.message
					? err.message
					: "Failed to save sale",
			);
		} finally {
			setLoading(false);
		}
	};

	const bounds = historyPageBounds(logs.length);
	const safeHistoryPage = bounds.clamp(historyPage);
	const pageItems = logs.slice(...bounds.slice(safeHistoryPage));
	const dayByKey = new Map(
		groupLogsByDay(logs, (log) => log.calculated_total).map(
			(g) => [g.key, g] as const,
		),
	);

	return (
		<div className="space-y-6">
			<h2 className="text-2xl font-bold tracking-tight">Game Sales</h2>

			{!loadingRates && rates.length === 0 && (
				<div className="p-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-md text-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
					<div>
						<span className="font-medium">No games configured!</span>
						<span className="ml-2">
							Please add your PS4 and Pool rates before logging sales.
						</span>
					</div>
					<Button
						size="sm"
						variant="outline"
						className="bg-white whitespace-nowrap"
						disabled={loadingDefaults}
						onClick={async () => {
							try {
								setLoadingDefaults(true);

								const [res1, res2] = await Promise.all([
									authFetch(`${API_BASE}/api/rates`, {
										method: "POST",
										headers: {
											"Content-Type": "application/json",
										},
										body: JSON.stringify({
											game_name: DEFAULT_GAME_RATES[0].game_name,
											price_per_unit: DEFAULT_GAME_RATES[0].price_per_unit,
											unit_type: DEFAULT_GAME_RATES[0].unit_type,
											isActive: true,
										}),
									}),
									authFetch(`${API_BASE}/api/rates`, {
										method: "POST",
										headers: {
											"Content-Type": "application/json",
										},
										body: JSON.stringify({
											game_name: DEFAULT_GAME_RATES[1].game_name,
											price_per_unit: DEFAULT_GAME_RATES[1].price_per_unit,
											unit_type: DEFAULT_GAME_RATES[1].unit_type,
											isActive: true,
										}),
									}),
								]);

								if (!res1.ok || !res2.ok) {
									throw new Error("Failed to create rates");
								}

								const [rate1, rate2] = await Promise.all([
									safeJson<GameRate>(res1),
									safeJson<GameRate>(res2),
								]);

								setRates((prev) => [...prev, rate1, rate2]);
								toast.success("Default games configured!");
							} catch (err: unknown) {
								console.error(err);
								toast.error(
									err instanceof Error && err.message
										? err.message
										: "Failed to configure games",
								);
							} finally {
								setLoadingDefaults(false);
							}
						}}
					>
						+ Add Default Games
					</Button>
				</div>
			)}

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				<Card className="lg:col-span-1 h-fit">
					<form onSubmit={handleSubmit}>
						<CardHeader>
							<CardTitle>{editingId ? "Edit Entry" : "New Entry"}</CardTitle>
							<CardDescription>
								{editingId
									? "Update the quantity for this log."
									: "Enter the quantity played. The system will calculate the total."}
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
								<Label htmlFor="game">Game / Table</Label>
								<select
									id="game"
									className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2"
									value={selectedRateId}
									onChange={(e) => setSelectedRateId(e.target.value)}
									required
								>
									<option value="" disabled>
										Select a game...
									</option>
									{rates.map((r) => (
										<option key={r.id} value={r.id}>
											{r.game_name} (${r.price_per_unit.toFixed(2)} /{" "}
											{r.unit_type})
										</option>
									))}
								</select>
							</div>
							<div className="space-y-2">
								<Label htmlFor="quantity">
									Quantity (
									{selectedRate ? `${selectedRate.unit_type}s` : "Units"})
								</Label>
								<Input
									id="quantity"
									type="number"
									step="0.1"
									min="0.1"
									value={quantity}
									onChange={(e) => setQuantity(e.target.value)}
									required
									placeholder="e.g., 1.5"
								/>
							</div>
							<div className="p-4 bg-zinc-50 rounded-md border border-zinc-100">
								<div className="text-sm text-zinc-500 mb-1">
									Calculated Total
								</div>
								<div className="text-3xl font-bold text-zinc-900">
									${calculatedTotal.toFixed(2)}
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
										placeholder="e.g., Typo in quantity"
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
									!selectedRate ||
									!quantity ||
									(!!editingId && !editReason)
								}
							>
								{loading ? (
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								) : null}
								{editingId ? "Update Sale" : "Log Sale"}
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
						<CardTitle>Game Sales Logs</CardTitle>
						<CardDescription>
							{rangeStart === todayStr && rangeEnd === todayStr
								? "Recent game sales logged today."
								: "Game sales in the selected range."}
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="flex gap-2 items-end mb-4">
							<div className="space-y-1">
								<Label htmlFor="salesRangeStart">From</Label>
								<Input
									id="salesRangeStart"
									type="date"
									value={rangeStart}
									onChange={(e) => setRangeStart(e.target.value)}
								/>
							</div>
							<div className="space-y-1">
								<Label htmlFor="salesRangeEnd">To</Label>
								<Input
									id="salesRangeEnd"
									type="date"
									value={rangeEnd}
									onChange={(e) => setRangeEnd(e.target.value)}
								/>
							</div>
							<Button
								type="button"
								variant="outline"
								onClick={() => void loadSalesLogs()}
							>
								Apply
							</Button>
						</div>
						{logs.length > 0 && (
							<div
								className="mb-3 flex items-center justify-between rounded-md bg-zinc-50 px-3 py-2 border"
								data-testid="sales-range-summary"
							>
								<span className="text-sm font-medium text-zinc-600">
									{logs.length} {logs.length === 1 ? "sale" : "sales"}
								</span>
								<span
									className={`text-base font-semibold ${logs.reduce((s, l) => s + l.calculated_total, 0) < 0 ? "text-red-500" : "text-emerald-600"}`}
								>
									Total $
									{logs
										.reduce((sum, l) => sum + l.calculated_total, 0)
										.toFixed(2)}
								</span>
							</div>
						)}
						<div>
							{logs.length === 0 ? (
								<div className="text-center text-zinc-500 py-8">
									{rangeStart === todayStr && rangeEnd === todayStr
										? "No game sales logged today yet."
										: "No game sales logged in this period."}
								</div>
							) : (
								<div className="rounded-md border bg-white divide-y">
									{pageItems.map((log, idx) => {
										const d = new Date(log.date);
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
											<div key={log.id}>
												{key !== prevKey && group && (
													<div className="flex items-center px-3 py-1 bg-zinc-50 text-xs font-medium text-zinc-600 border-b">
														<span className="font-medium">{group.label}</span>
													</div>
												)}
												<div className="flex items-center gap-2 px-3 py-1.5 text-sm flex-wrap">
													<span className="font-medium shrink-0">
														{log.game_name}
													</span>
													<span className="text-zinc-500">
														{log.quantity_sold} units @ $
														{log.rate_applied.toFixed(2)} ={" "}
														<span className="font-semibold text-zinc-900">
															${log.calculated_total.toFixed(2)}
														</span>
													</span>
													<span className="text-zinc-400 tabular-nums w-16 shrink-0">
														{format(d, "h:mm a")}
													</span>
													{log.user_name && (
														<span className="text-zinc-500 truncate max-w-[10rem]">
															{log.user_name}
														</span>
													)}
													{(user?.role === ROLES.MANAGER ||
														user?.role === ROLES.ADMIN) && (
														<div className="ml-auto flex items-center gap-2">
															<Button
																size="sm"
																variant="outline"
																onClick={() => handleEdit(log)}
																disabled={!!editingId || deletePending}
															>
																<Edit2 className="h-4 w-4 mr-1" /> Edit
															</Button>
															<Button
																size="sm"
																variant="ghost"
																className="text-red-600 hover:text-red-700 hover:bg-red-50"
																onClick={() => setDeletingId(log.id)}
																disabled={!!editingId || deletePending}
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
							{logs.length > HISTORY_PAGE_SIZE && (
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
				title="Delete Game Sale"
				message="Are you sure you want to delete this game sale entry? This action cannot be undone."
				reasonValue={deleteReason}
				onReasonChange={setDeleteReason}
				requireReason
				loading={deletePending}
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
