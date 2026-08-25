import type { KenoLog } from "@level-up/shared";
import { ROLES } from "@level-up/shared";
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
import { API_BASE, authFetch, listFromPayload, safeJson } from "../lib/api";
import { getShopEndOfDay, getShopStartOfDay } from "../lib/dateUtils";
import {
	groupLogsByDay,
	HISTORY_PAGE_SIZE,
	historyPageBounds,
} from "../lib/history";

// Pure so the NaN-hole guard is unit-testable (jsdom sanitizes number inputs,
// making the guard unreachable through change events in tests).
// Uses full-string Number() semantics — mirroring the server's z.coerce +
// NaN-refine — so partial/garbage input ("1e-", "--1") is rejected outright.
export const parseNetAmountInput = (raw: string): number | null => {
	const trimmed = raw.trim();
	if (trimmed === "") return null;
	const parsed = Number(trimmed);
	return Number.isFinite(parsed) ? parsed : null;
};

export function Keno() {
	const { user } = useAuth();
	const [netAmount, setNetAmount] = useState("");
	const todayStr = new Date().toISOString().slice(0, 10);
	const [rangeStart, setRangeStart] = useState(todayStr);
	const [rangeEnd, setRangeEnd] = useState(todayStr);
	const [entryDate, setEntryDate] = useState(() =>
		new Date().toISOString().slice(0, 10),
	);
	const [loading, setLoading] = useState(false);
	const [logs, setLogs] = useState<KenoLog[]>([]);
	const [editingId, setEditingId] = useState<string | null>(null);
	const [deletingId, setDeletingId] = useState<string | null>(null);
	const [verifyingId, setVerifyingId] = useState<string | null>(null);
	const [deletePending, setDeletePending] = useState(false);
	const [historyPage, setHistoryPage] = useState(0);
	const [nextCursor, setNextCursor] = useState<string | null>(null);
	const [listLoading, setListLoading] = useState(false);
	const [editReason, setEditReason] = useState("");
	const [deleteReason, setDeleteReason] = useState("");

	const loadKenoLogs = useCallback(async () => {
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
				`${API_BASE}/api/keno?startDate=${encodeURIComponent(startISO)}&endDate=${encodeURIComponent(endISO)}&limit=200`,
			);
			if (!response.ok) {
				throw new Error(
					(await safeJson(response)).error || "Failed to fetch keno logs",
				);
			}

			const payload = (await safeJson<
				KenoLog[] | { data: KenoLog[]; nextCursor: string | null }
			>(response)) as
				| KenoLog[]
				| { data: KenoLog[]; nextCursor: string | null };
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
					: "Failed to load keno logs",
			);
		} finally {
			setListLoading(false);
		}
	}, [rangeStart, rangeEnd]);

	useEffect(() => {
		void loadKenoLogs();

		const handleVisibility = () => {
			if (document.visibilityState === "visible") {
				void loadKenoLogs();
			}
		};
		document.addEventListener("visibilitychange", handleVisibility);

		return () => {
			document.removeEventListener("visibilitychange", handleVisibility);
		};
	}, [loadKenoLogs]);

	const handleEdit = (log: KenoLog) => {
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
			const response = await authFetch(`${API_BASE}/api/keno/${id}`, {
				method: "DELETE",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ deleteReason }),
			});
			if (!response.ok)
				throw new Error((await safeJson(response)).error || "Failed to delete");

			toast.success("Keno log deleted successfully!");
			setLogs((prev) => prev.filter((l) => l.id !== id));
			setDeletingId(null);
			setDeleteReason("");
		} catch (err: unknown) {
			console.error(err);
			toast.error(
				err instanceof Error && err.message
					? err.message
					: "Failed to delete keno log",
			);
		} finally {
			setDeletePending(false);
		}
	};

	const handleVerify = async (id: string) => {
		setVerifyingId(id);
		try {
			const response = await authFetch(`${API_BASE}/api/keno/${id}/verify`, {
				method: "PUT",
			});
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
					: "Failed to verify keno log",
			);
		} finally {
			setVerifyingId(null);
		}
	};

	const loadOlderKeno = async () => {
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
				`${API_BASE}/api/keno?startDate=${encodeURIComponent(startISO)}&endDate=${encodeURIComponent(endISO)}&limit=200&cursor=${encodeURIComponent(nextCursor)}`,
			);
			if (!res.ok) throw new Error("Failed to fetch keno logs");
			const payload = (await safeJson(res)) as
				| KenoLog[]
				| { data: KenoLog[]; nextCursor: string | null };
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
					: "Failed to load keno logs",
			);
		} finally {
			setListLoading(false);
		}
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!netAmount || !user) return;

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
				const response = await authFetch(`${API_BASE}/api/keno/${editingId}`, {
					method: "PUT",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						net_profit: parsedNet,
						editReason,
					}),
				});
				if (!response.ok)
					throw new Error(
						(await safeJson(response)).error || "Failed to update",
					);
				const updated = await safeJson<KenoLog>(response);
				toast.success("Keno log updated successfully!");
				setLogs((prev) => prev.map((l) => (l.id === editingId ? updated : l)));
				cancelEdit();
			} else {
				const response = await authFetch(`${API_BASE}/api/keno`, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						net_profit: parsedNet,
						date: new Date(entryDate).toISOString(),
					}),
				});
				if (!response.ok)
					throw new Error(
						(await safeJson(response)).error || "Failed to log keno",
					);
				const newLog = await safeJson<KenoLog>(response);
				setLogs((prev) => [newLog, ...prev]);
				setNetAmount("");
				toast.success("Keno logged successfully!");
			}
		} catch (err: unknown) {
			console.error(err);
			toast.error(
				err instanceof Error && err.message
					? err.message
					: "Failed to save keno log",
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
			<h2 className="text-2xl font-bold tracking-tight">Log Keno</h2>
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				<Card className="lg:col-span-1 h-fit">
					<form onSubmit={handleSubmit}>
						<CardHeader>
							<CardTitle>Daily Keno Entry</CardTitle>
							<CardDescription>
								Enter the net amount from the Keno software.
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
										placeholder="e.g., Typo in sales amount"
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
								{editingId ? "Update Keno" : "Log Keno"}
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
						<CardTitle>Keno Logs</CardTitle>
						<CardDescription>
							{rangeStart === todayStr && rangeEnd === todayStr
								? "Recent Keno entries logged today."
								: "Keno entries in the selected range."}
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="flex gap-2 items-end mb-3">
							<div className="space-y-1">
								<Label htmlFor="kenoRangeStart">From</Label>
								<Input
									id="kenoRangeStart"
									type="date"
									value={rangeStart}
									onChange={(e) => setRangeStart(e.target.value)}
								/>
							</div>
							<div className="space-y-1">
								<Label htmlFor="kenoRangeEnd">To</Label>
								<Input
									id="kenoRangeEnd"
									type="date"
									value={rangeEnd}
									onChange={(e) => setRangeEnd(e.target.value)}
								/>
							</div>
							<Button
								type="button"
								variant="outline"
								onClick={() => void loadKenoLogs()}
								disabled={rangeStart > rangeEnd || listLoading}
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
							>
								Today
							</Button>
						</div>
						{rangeStart > rangeEnd && (
							<p className="text-xs text-red-500 mb-2">
								From date must be on or before To
							</p>
						)}
						{logs.length > 0 && (
							<div
								className="mb-3 flex items-center justify-between rounded-md bg-zinc-50 px-3 py-2 border"
								data-testid="keno-range-summary"
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
									{rangeStart === todayStr && rangeEnd === todayStr
										? "No Keno logged today yet."
										: "No Keno logged in this period."}
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
												<div className="flex items-center gap-2 px-3 py-1.5 text-sm flex-wrap">
													<span className="text-zinc-400 tabular-nums w-16 shrink-0">
														{format(d, "h:mm a")}
													</span>
													{log.user_name && (
														<span className="text-zinc-500 truncate max-w-[10rem]">
															{log.user_name}
														</span>
													)}
													{log.sales != null && log.payouts != null && (
														<span className="text-xs text-zinc-400 hidden md:inline">
															Sales ${log.sales.toFixed(2)} &middot; Payouts $
															{log.payouts.toFixed(2)}
														</span>
													)}
													<span
														className={`ml-auto font-semibold ${log.net_profit < 0 ? "text-red-500" : "text-emerald-600"}`}
													>
														Net: ${log.net_profit.toFixed(2)}
													</span>
													{log.verified ? (
														<span className="text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-sm text-xs">
															Verified
														</span>
													) : (
														<span className="text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-sm text-xs">
															Unverified
														</span>
													)}
													{!log.verified &&
														(user?.role === ROLES.MANAGER ||
															user?.role === ROLES.ADMIN) && (
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
													{(user?.role === ROLES.MANAGER ||
														user?.role === ROLES.ADMIN) && (
														<>
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
																aria-label="Delete keno log"
															>
																<Trash2 className="h-4 w-4" />
															</Button>
														</>
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
									onClick={() => void loadOlderKeno()}
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
				title="Delete Keno Ticket"
				message="Are you sure you want to delete this keno ticket? This action cannot be undone."
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
