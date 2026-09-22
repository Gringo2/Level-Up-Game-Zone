import type { AuditLog } from "@level-up/shared";
import { format } from "date-fns";
import { Filter, Loader2, RotateCcw, Search, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
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
import { API_BASE, authFetch, safeJson } from "../lib/api";

const KNOWN_TABLES = [
	"shifts",
	"game_sales",
	"keno_tickets",
	"expenses",
	"credits",
	"employees",
	"users",
	"game_rates",
	"expense_categories",
];

export const getActionType = (log: AuditLog) => {
	if (log.action) return log.action;
	if (log.old_value && log.new_value) return "UPDATE";
	if (log.old_value && !log.new_value) return "DELETE";
	return "CREATE";
};

export function AuditLogs() {
	const [logs, setLogs] = useState<AuditLog[]>([]);
	const [loading, setLoading] = useState(true);
	const [nextCursor, setNextCursor] = useState<string | null>(null);
	const [loadingMore, setLoadingMore] = useState(false);

	// Filtering state
	const [actionFilter, setActionFilter] = useState<string>("ALL");
	const [tableFilter, setTableFilter] = useState<string>("ALL");
	const [searchQuery, setSearchQuery] = useState<string>("");

	const fetchLogs = useCallback(async (cursor?: string) => {
		try {
			let url = `${API_BASE}/api/audit-logs?limit=50`;
			if (cursor) url += `&cursor=${cursor}`;

			const response = await authFetch(url);

			if (!response.ok) {
				throw new Error(
					(await safeJson(response)).error || "Failed to fetch audit logs",
				);
			}

			const payload = await safeJson<{
				data: AuditLog[];
				nextCursor: string | null;
			}>(response);

			setLogs((prev) => (cursor ? [...prev, ...payload.data] : payload.data));
			setNextCursor(payload.nextCursor);
		} catch (err) {
			console.error(err);
			toast.error("Failed to load audit logs");
		}
	}, []);

	useEffect(() => {
		let mounted = true;
		setLoading(true);
		fetchLogs().finally(() => {
			if (mounted) setLoading(false);
		});
		return () => {
			mounted = false;
		};
	}, [fetchLogs]);

	const handleLoadMore = async () => {
		if (!nextCursor) return;
		setLoadingMore(true);
		await fetchLogs(nextCursor);
		setLoadingMore(false);
	};

	const availableTables = useMemo(() => {
		const set = new Set<string>(KNOWN_TABLES);
		logs.forEach((log) => {
			if (log.table_affected) {
				set.add(log.table_affected);
			}
		});
		return Array.from(set).sort();
	}, [logs]);

	const hasActiveFilters =
		actionFilter !== "ALL" ||
		tableFilter !== "ALL" ||
		searchQuery.trim() !== "";

	const handleClearFilters = () => {
		setActionFilter("ALL");
		setTableFilter("ALL");
		setSearchQuery("");
	};

	const filteredLogs = useMemo(() => {
		const query = searchQuery.trim().toLowerCase();
		return logs.filter((log) => {
			// Action filter
			if (actionFilter !== "ALL") {
				const action = getActionType(log);
				if (action !== actionFilter) return false;
			}

			// Table filter
			if (tableFilter !== "ALL") {
				if (log.table_affected !== tableFilter) return false;
			}

			// Search query
			if (query) {
				const userMatch = log.user_id?.toLowerCase().includes(query);
				const reasonMatch = log.reason_for_change
					?.toLowerCase()
					.includes(query);
				const tableMatch = log.table_affected?.toLowerCase().includes(query);
				const payloadOldMatch = log.old_value
					? JSON.stringify(log.old_value).toLowerCase().includes(query)
					: false;
				const payloadNewMatch = log.new_value
					? JSON.stringify(log.new_value).toLowerCase().includes(query)
					: false;

				if (
					!userMatch &&
					!reasonMatch &&
					!tableMatch &&
					!payloadOldMatch &&
					!payloadNewMatch
				) {
					return false;
				}
			}

			return true;
		});
	}, [logs, actionFilter, tableFilter, searchQuery]);

	if (loading)
		return (
			<div className="p-8 text-center">
				<Loader2 className="animate-spin mx-auto text-zinc-400" />
			</div>
		);

	return (
		<div className="space-y-6 max-w-5xl mx-auto">
			<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
				<div>
					<h2 className="text-2xl font-bold tracking-tight">Activity Log</h2>
					<p className="text-zinc-500 text-sm">
						Immutable audit trail of all transactions, modifications, and
						deletions.
					</p>
				</div>
				<div className="text-xs text-zinc-500 font-medium">
					Showing {filteredLogs.length} of {logs.length} activity logs
				</div>
			</div>

			<Card>
				<CardHeader className="pb-4">
					<CardTitle>System Audit History</CardTitle>
					<CardDescription>
						Track who changed what, when, and why across all system collections.
					</CardDescription>

					{/* Filter & Search Toolbar */}
					<div className="pt-4 flex flex-col md:flex-row gap-3 items-stretch md:items-end">
						{/* Search Input */}
						<div className="flex-1 space-y-1">
							<label
								htmlFor="audit-search"
								className="text-xs font-medium text-zinc-600 block"
							>
								Search Audit Trail
							</label>
							<div className="relative">
								<Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
								<Input
									id="audit-search"
									type="text"
									placeholder="Search by operator UID, reason, or payload..."
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
									className="pl-9 pr-8 h-9 text-sm"
								/>
								{searchQuery && (
									<button
										type="button"
										onClick={() => setSearchQuery("")}
										className="absolute right-2.5 top-2.5 text-zinc-400 hover:text-zinc-600"
										aria-label="Clear search text"
									>
										<X className="h-4 w-4" />
									</button>
								)}
							</div>
						</div>

						{/* Action Filter */}
						<div className="w-full md:w-44 space-y-1">
							<label
								htmlFor="filter-action"
								className="text-xs font-medium text-zinc-600 block"
							>
								Action Filter
							</label>
							<select
								id="filter-action"
								value={actionFilter}
								onChange={(e) => setActionFilter(e.target.value)}
								className="h-9 w-full rounded-md border border-zinc-200 bg-white px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950"
							>
								<option value="ALL">All Actions</option>
								<option value="CREATE">CREATE</option>
								<option value="UPDATE">UPDATE</option>
								<option value="DELETE">DELETE</option>
							</select>
						</div>

						{/* Collection / Table Filter */}
						<div className="w-full md:w-48 space-y-1">
							<label
								htmlFor="filter-table"
								className="text-xs font-medium text-zinc-600 block"
							>
								Collection Filter
							</label>
							<select
								id="filter-table"
								value={tableFilter}
								onChange={(e) => setTableFilter(e.target.value)}
								className="h-9 w-full rounded-md border border-zinc-200 bg-white px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950"
							>
								<option value="ALL">All Collections</option>
								{availableTables.map((tbl) => (
									<option key={tbl} value={tbl}>
										{tbl.replace(/_/g, " ")}
									</option>
								))}
							</select>
						</div>

						{/* Clear Button */}
						{hasActiveFilters && (
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={handleClearFilters}
								className="h-9 text-zinc-600 hover:text-zinc-900 shrink-0"
							>
								<RotateCcw className="h-3.5 w-3.5 mr-1.5" />
								Clear Filters
							</Button>
						)}
					</div>
				</CardHeader>
				<CardContent>
					<div className="overflow-x-auto">
						<table className="w-full text-sm text-left">
							<thead className="text-xs text-zinc-500 uppercase bg-zinc-50 border-b">
								<tr>
									<th className="px-4 py-3 font-medium">Time</th>
									<th className="px-4 py-3 font-medium">Operator UID</th>
									<th className="px-4 py-3 font-medium">Action</th>
									<th className="px-4 py-3 font-medium">Table Affected</th>
									<th className="px-4 py-3 font-medium">Reason for Change</th>
									<th className="px-4 py-3 font-medium">Payload Data</th>
								</tr>
							</thead>
							<tbody className="divide-y">
								{logs.length === 0 ? (
									<tr>
										<td
											colSpan={6}
											className="px-4 py-8 text-center text-zinc-500"
										>
											No activity logs recorded.
										</td>
									</tr>
								) : filteredLogs.length === 0 ? (
									<tr>
										<td colSpan={6} className="px-4 py-12 text-center">
											<div className="flex flex-col items-center justify-center space-y-2">
												<Filter className="h-8 w-8 text-zinc-400" />
												<p className="text-sm font-medium text-zinc-700">
													No activity logs match the selected filters.
												</p>
												<p className="text-xs text-zinc-400 max-w-sm">
													Try adjusting your search terms, action type, or
													collection filter.
												</p>
												<Button
													variant="outline"
													size="sm"
													onClick={handleClearFilters}
													className="mt-2 text-xs"
												>
													Clear filters
												</Button>
											</div>
										</td>
									</tr>
								) : (
									filteredLogs.map((log) => {
										const action = getActionType(log);
										return (
											<tr key={log.id} className="hover:bg-zinc-50">
												<td className="px-4 py-3 whitespace-nowrap text-zinc-500 font-mono text-xs">
													{log.timestamp
														? format(
																new Date(log.timestamp),
																"MMM d, yyyy h:mm a",
															)
														: "N/A"}
												</td>
												<td className="px-4 py-3 font-mono text-xs text-zinc-700">
													{log.user_id
														? `${log.user_id.slice(0, 8)}...`
														: "System"}
												</td>
												<td className="px-4 py-3">
													<span
														className={`px-2 py-0.5 rounded-full text-xs font-medium ${
															action === "UPDATE"
																? "bg-blue-100 text-blue-800"
																: action === "DELETE"
																	? "bg-red-100 text-red-800"
																	: "bg-emerald-100 text-emerald-800"
														}`}
													>
														{action}
													</span>
												</td>
												<td className="px-4 py-3 capitalize font-medium text-zinc-800">
													{log.table_affected
														? log.table_affected.replace(/_/g, " ")
														: "General"}
												</td>
												<td className="px-4 py-3 text-zinc-600">
													{log.reason_for_change || "N/A"}
												</td>
												<td
													className="px-4 py-3 text-xs text-zinc-400 font-mono max-w-xs truncate cursor-help"
													title={JSON.stringify(
														{ old: log.old_value, new: log.new_value },
														null,
														2,
													)}
												>
													{JSON.stringify(log.new_value || log.old_value || {})}
												</td>
											</tr>
										);
									})
								)}
							</tbody>
						</table>
					</div>
					{nextCursor && (
						<div className="mt-4 flex justify-center">
							<button
								type="button"
								onClick={handleLoadMore}
								disabled={loadingMore}
								className="px-4 py-2 text-sm font-medium text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-md disabled:opacity-50 flex items-center gap-2"
							>
								{loadingMore ? (
									<Loader2 className="w-4 h-4 animate-spin" />
								) : null}
								{loadingMore ? "Loading..." : "Load More"}
							</button>
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
