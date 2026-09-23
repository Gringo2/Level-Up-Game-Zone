import type { SportsBettingLog } from "@level-up/shared";
import { ROLES } from "@level-up/shared";
import { format } from "date-fns";
import { Edit2, Loader2, Trash2, Trophy } from "lucide-react";
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
import { API_BASE, authFetch, listFromPayload, safeJson } from "../lib/api";
import {
	getShopDateString,
	getShopEndOfDay,
	getShopStartOfDay,
} from "../lib/dateUtils";
import {
	groupLogsByDay,
	HISTORY_PAGE_SIZE,
	historyPageBounds,
} from "../lib/history";
import { parseNetAmountInput } from "../lib/inputUtils";

export function SportsBetting() {
	const { user } = useAuth();
	const [netAmount, setNetAmount] = useState("");
	const todayStr = getShopDateString();
	const [rangeStart, setRangeStart] = useState(todayStr);
	const [rangeEnd, setRangeEnd] = useState(todayStr);
	const [entryDate, setEntryDate] = useState(() => getShopDateString());
	const [loading, setLoading] = useState(false);
	const [logs, setLogs] = useState<SportsBettingLog[]>([]);
	const [editingId, setEditingId] = useState<string | null>(null);
	const [deletingId, setDeletingId] = useState<string | null>(null);
	const [verifyingId, setVerifyingId] = useState<string | null>(null);
	const [deletePending, setDeletePending] = useState(false);
	const [historyPage, setHistoryPage] = useState(0);
	const [nextCursor, setNextCursor] = useState<string | null>(null);
	const [listLoading, setListLoading] = useState(false);
	const [editReason, setEditReason] = useState("");
	const [deleteReason, setDeleteReason] = useState("");

	const isWithinActiveRange = (date: string) => {
		const shopDate = getShopDateString(new Date(date));
		return shopDate >= rangeStart && shopDate <= rangeEnd;
	};

	const loadLogs = useCallback(async () => {
		if (rangeStart > rangeEnd) return;
		setListLoading(true);
		try {
			const startISO = getShopStartOfDay(
				new Date(`${rangeStart}T00:00:00`),
			).toISOString();
			const endISO = getShopEndOfDay(
				new Date(`${rangeEnd}T00:00:00`),
			).toISOString();
			const response = await authFetch(
				`${API_BASE}/api/sports-betting?startDate=${encodeURIComponent(startISO)}&endDate=${encodeURIComponent(endISO)}&limit=200`,
			);
			if (!response.ok) {
				throw new Error(
					(await safeJson(response)).error ||
						"Failed to fetch sports betting logs",
				);
			}

			const payload = (await safeJson<
				| SportsBettingLog[]
				| { data: SportsBettingLog[]; nextCursor: string | null }
			>(response)) as
				| SportsBettingLog[]
				| { data: SportsBettingLog[]; nextCursor: string | null };
			const data = listFromPayload(payload);
			setNextCursor(Array.isArray(payload) ? null : payload.nextCursor);
			setLogs(
				data.sort(
					(a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
				),
			);
			setHistoryPage(0);
		} catch (err: unknown) {
			console.error(err);
			toast.error(
				err instanceof Error && err.message
					? err.message
					: "Failed to load sports betting logs",
			);
		} finally {
			setListLoading(false);
		}
	}, [rangeStart, rangeEnd]);

	useEffect(() => {
		void loadLogs();

		const handleVisibility = () => {
			if (document.visibilityState === "visible") {
				void loadLogs();
			}
		};
		document.addEventListener("visibilitychange", handleVisibility);

		return () => {
			document.removeEventListener("visibilitychange", handleVisibility);
		};
	}, [loadLogs]);

	const handleEdit = (log: SportsBettingLog) => {
		setEditingId(log.id);
		setNetAmount(log.net_profit.toString());
		window.scrollTo({ top: 0, behavior: "smooth" });
	};

	const cancelEdit = () => {
		setEditingId(null);
		setNetAmount("");
		setEditReason("");
	};

	const handleDelete = async (id: string) => {
		if (!deleteReason || !user) {
			toast.error("Please provide a reason for deletion.");
			return;
		}
		setDeletePending(true);
		try {
			const response = await authFetch(`${API_BASE}/api/sports-betting/${id}`, {
				method: "DELETE",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ deleteReason }),
			});
			if (!response.ok)
				throw new Error((await safeJson(response)).error || "Failed to delete");

			toast.success("Sports betting log deleted successfully!");
			setLogs((prev) => prev.filter((l) => l.id !== id));
			setDeletingId(null);
			setDeleteReason("");
		} catch (err: unknown) {
			console.error(err);
			toast.error(
				err instanceof Error && err.message
					? err.message
					: "Failed to delete sports betting log",
			);
		} finally {
			setDeletePending(false);
		}
	};

	const handleVerify = async (id: string) => {
		setVerifyingId(id);
		try {
			const response = await authFetch(
				`${API_BASE}/api/sports-betting/${id}/verify`,
				{ method: "PUT" },
			);
			if (!response.ok)
				throw new Error((await safeJson(response)).error || "Failed to verify");

			toast.success("Log verified!");
			setLogs((prev) =>
				prev.map((l) => (l.id === id ? { ...l, verified: true } : l)),
			);
		} catch (err: unknown) {
			console.error(err);
			toast.error(
				err instanceof Error && err.message
					? err.message
					: "Failed to verify sports betting log",
			);
		} finally {
			setVerifyingId(null);
		}
	};

	const loadOlderLogs = async () => {
		if (!nextCursor) return;
		setListLoading(true);
		try {
			const startISO = getShopStartOfDay(
				new Date(`${rangeStart}T00:00:00`),
			).toISOString();
			const endISO = getShopEndOfDay(
				new Date(`${rangeEnd}T00:00:00`),
			).toISOString();
			const res = await authFetch(
				`${API_BASE}/api/sports-betting?startDate=${encodeURIComponent(startISO)}&endDate=${encodeURIComponent(endISO)}&limit=200&cursor=${encodeURIComponent(nextCursor)}`,
			);
			if (!res.ok) throw new Error("Failed to fetch sports betting logs");
			const payload = (await safeJson(res)) as
				| SportsBettingLog[]
				| { data: SportsBettingLog[]; nextCursor: string | null };
			const older = listFromPayload(payload);
			setNextCursor(Array.isArray(payload) ? null : payload.nextCursor);
			setLogs((prev) =>
				[...prev, ...older].sort(
					(a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
				),
			);
		} catch (err: unknown) {
			console.error(err);
			toast.error(
				err instanceof Error && err.message
					? err.message
					: "Failed to load sports betting logs",
			);
		} finally {
			setListLoading(false);
		}
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!user) return;

		const parsedNet = parseNetAmountInput(netAmount);
		if (parsedNet === null) {
			toast.error("Please enter a valid net amount.");
			return;
		}

		setLoading(true);
		try {
			if (editingId) {
				if (!editReason) {
					toast.error("Please provide a reason for editing.");
					setLoading(false);
					return;
				}
				const response = await authFetch(
					`${API_BASE}/api/sports-betting/${editingId}`,
					{
						method: "PUT",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({ net_profit: parsedNet, editReason }),
					},
				);
				if (!response.ok)
					throw new Error(
						(await safeJson(response)).error || "Failed to update",
					);
				const updated = await safeJson<SportsBettingLog>(response);
				toast.success("Sports betting log updated successfully!");
				setLogs((prev) => {
					const withoutUpdated = prev.filter((l) => l.id !== editingId);
					if (!isWithinActiveRange(updated.date)) {
						return withoutUpdated;
					}
					return [...withoutUpdated, updated].sort(
						(a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
					);
				});
				cancelEdit();
			} else {
				const response = await authFetch(`${API_BASE}/api/sports-betting`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						net_profit: parsedNet,
						date: new Date(entryDate).toISOString(),
					}),
				});
				if (!response.ok)
					throw new Error(
						(await safeJson(response)).error || "Failed to log sports betting",
					);
				const newLog = await safeJson<SportsBettingLog>(response);
				if (isWithinActiveRange(newLog.date)) {
					setLogs((prev) => [newLog, ...prev]);
				}
				setNetAmount("");
				toast.success("Sports betting logged successfully!");
			}
		} catch (err: unknown) {
			console.error(err);
			toast.error(
				err instanceof Error && err.message
					? err.message
					: "Failed to save sports betting log",
			);
		} finally {
			setLoading(false);
		}
	};

	const bounds = historyPageBounds(logs.length);
	const safeHistoryPage = bounds.clamp(historyPage);
	const pageItems = logs.slice(...bounds.slice(safeHistoryPage));
	const dayByKey = new Map(
		groupLogsByDay(logs, (log) => log.net_profit).map(
			(g) => [g.key, g] as const,
		),
	);

	return (
		<div className="space-y-6">
			<h2 className="text-2xl font-bold tracking-tight">Log Sports Betting</h2>
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				<Card className="lg:col-span-1 h-fit">
					<form onSubmit={handleSubmit}>
						<CardHeader>
							<CardTitle>{editingId ? "Edit Entry" : "New Entry"}</CardTitle>
							<CardDescription>
								{editingId
									? "Update the net amount for this log."
									: "Enter the net amount from the sports betting software."}
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
								<Label htmlFor="net">Net Amount ($)</Label>
								<Input
									id="net"
									type="number"
									step="0.01"
									inputMode="decimal"
									value={netAmount}
									onChange={(e) => setNetAmount(e.target.value)}
									required
								/>
							</div>
							<div className="p-4 bg-zinc-50 rounded-md border border-zinc-100">
								<div className="text-sm text-zinc-500 mb-1">Net Profit</div>
								<div
									className={`text-3xl font-bold ${parseFloat(netAmount || "0") < 0 ? "text-red-500" : "text-emerald-600"}`}
								>
									${parseFloat(netAmount || "0").toFixed(2)}
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
										placeholder="e.g., Typo in net amount"
									/>
								</div>
							)}
						</CardContent>
						<CardFooter className="flex gap-2">
							<Button
								type="submit"
								className="flex-1"
								disabled={loading || !netAmount || (!!editingId && !editReason)}
							>
								{loading ? (
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								) : null}
								{editingId ? "Update Entry" : "Log Betting"}
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
						<CardTitle>Sports Betting Logs</CardTitle>
						<CardDescription>
							{rangeStart === todayStr && rangeEnd === todayStr
								? "Recent sports betting entries logged today."
								: "Sports betting entries in the selected range."}
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="flex flex-col min-[400px]:flex-row flex-wrap sm:flex-nowrap gap-2 items-end mb-3">
							<div className="space-y-1 w-full min-[400px]:flex-1 min-w-0">
								<Label htmlFor="bettingRangeStart">From</Label>
								<Input
									id="bettingRangeStart"
									type="date"
									value={rangeStart}
									onChange={(e) => setRangeStart(e.target.value)}
								/>
							</div>
							<div className="space-y-1 w-full min-[400px]:flex-1 min-w-0">
								<Label htmlFor="bettingRangeEnd">To</Label>
								<Input
									id="bettingRangeEnd"
									type="date"
									value={rangeEnd}
									onChange={(e) => setRangeEnd(e.target.value)}
								/>
							</div>
							<div className="flex gap-2 w-full min-[400px]:w-auto">
								<Button
									type="button"
									variant="outline"
									onClick={() => void loadLogs()}
									disabled={rangeStart > rangeEnd || listLoading}
									className="flex-1 min-[400px]:flex-initial"
								>
									{listLoading && (
										<Loader2
											data-testid="history-loading"
											className="mr-1 h-4 w-4 animate-spin"
										/>
									)}
									Apply
								</Button>
								<Button
									type="button"
									variant="ghost"
									onClick={() => {
										setRangeStart(todayStr);
										setRangeEnd(todayStr);
									}}
									disabled={listLoading}
									className="flex-1 min-[400px]:flex-initial"
								>
									Today
								</Button>
							</div>
						</div>
						{rangeStart > rangeEnd && (
							<p className="text-xs text-red-500 mb-2">
								From date must be on or before To
							</p>
						)}
						{logs.length > 0 && (
							<div
								className="mb-3 flex items-center justify-between rounded-md bg-zinc-50 px-3 py-2 border"
								data-testid="betting-range-summary"
							>
								<span className="text-sm font-medium text-zinc-600">
									{logs.length} {logs.length === 1 ? "entry" : "entries"}
								</span>
								<span
									className={`text-base font-semibold ${logs.reduce((s, l) => s + l.net_profit, 0) < 0 ? "text-red-500" : "text-emerald-600"}`}
								>
									Net $
									{logs.reduce((sum, l) => sum + l.net_profit, 0).toFixed(2)}
								</span>
							</div>
						)}
						<div>
							{logs.length === 0 ? (
								<div className="text-center text-zinc-500 py-8">
									<Trophy
										className="mx-auto h-8 w-8 text-zinc-300 mb-2"
										aria-hidden="true"
									/>
									<p>
										{rangeStart === todayStr && rangeEnd === todayStr
											? "No sports betting logged today yet."
											: "No sports betting logged in this period."}
									</p>
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
													<div className="flex items-center justify-between px-3 py-1 bg-zinc-50 text-xs font-medium text-zinc-600 border-b">
														<span className="font-medium">{group.label}</span>
													</div>
												)}
												<div
													className="grid gap-3 px-3 py-2 text-sm md:grid-cols-[minmax(0,1fr)_auto] md:items-center"
													data-testid="betting-history-row"
												>
													<div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
														<span
															className={`font-semibold ${log.net_profit < 0 ? "text-red-500" : "text-emerald-600"}`}
														>
															Net: ${log.net_profit.toFixed(2)}
														</span>
														<span className="text-zinc-400 tabular-nums w-16 shrink-0">
															{format(d, "h:mm a")}
														</span>
														{log.user_name && (
															<span className="text-zinc-500 truncate max-w-[10rem]">
																{log.user_name}
															</span>
														)}
														{log.verified ? (
															<span className="text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-sm text-xs">
																Verified
															</span>
														) : (
															<span className="text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-sm text-xs">
																Unverified
															</span>
														)}
													</div>
													{(user?.role === ROLES.MANAGER ||
														user?.role === ROLES.ADMIN) && (
														<div className="flex flex-wrap items-center gap-2 md:justify-end">
															{!log.verified && (
																<Button
																	size="sm"
																	variant="outline"
																	className="text-emerald-600 border-emerald-200 hover:bg-emerald-50"
																	onClick={() => handleVerify(log.id)}
																	disabled={!!verifyingId || deletePending}
																>
																	Verify
																</Button>
															)}
															<Button
																size="sm"
																variant="outline"
																onClick={() => handleEdit(log)}
																disabled={
																	!!editingId || !!verifyingId || deletePending
																}
															>
																<Edit2 className="h-4 w-4 mr-1" /> Edit
															</Button>
															<Button
																size="sm"
																variant="ghost"
																className="text-red-600 hover:text-red-700 hover:bg-red-50"
																onClick={() => setDeletingId(log.id)}
																disabled={
																	!!editingId || !!verifyingId || deletePending
																}
																aria-label="Delete sports betting log"
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
							{nextCursor && (
								<Button
									type="button"
									variant="outline"
									size="sm"
									className="mt-3"
									data-testid="load-older"
									onClick={() => void loadOlderLogs()}
									disabled={listLoading}
								>
									Load older
								</Button>
							)}
						</div>
					</CardContent>
				</Card>
			</div>
			<ConfirmDialog
				open={!!deletingId}
				title="Delete Sports Betting Log"
				message="Are you sure you want to delete this sports betting log? This action cannot be undone."
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
