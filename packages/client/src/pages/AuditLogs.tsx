import type { AuditLog } from "@level-up/shared";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "../components/ui/card";
import { auth } from "../firebase";
import { API_BASE, safeJson } from "../lib/api";

export function AuditLogs() {
	const [logs, setLogs] = useState<AuditLog[]>([]);
	const [loading, setLoading] = useState(true);
	const [nextCursor, setNextCursor] = useState<string | null>(null);
	const [loadingMore, setLoadingMore] = useState(false);

	const fetchLogs = useCallback(async (cursor?: string) => {
		try {
			const token = await auth.currentUser?.getIdToken();
			if (!token) throw new Error("Not authenticated");

			let url = `${API_BASE}/api/audit-logs?limit=50`;
			if (cursor) url += `&cursor=${cursor}`;

			const response = await fetch(url, {
				headers: {
					Authorization: `Bearer ${token}`,
				},
			});

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

	const getActionType = (log: AuditLog) => {
		if (log.old_value && log.new_value) return "UPDATE";
		if (log.old_value && !log.new_value) return "DELETE";
		return "CREATE";
	};

	if (loading)
		return (
			<div className="p-8 text-center">
				<Loader2 className="animate-spin mx-auto text-zinc-400" />
			</div>
		);

	return (
		<div className="space-y-6 max-w-5xl mx-auto">
			<h2 className="text-2xl font-bold tracking-tight">Activity Log</h2>
			<Card>
				<CardHeader>
					<CardTitle>System Audit History</CardTitle>
					<CardDescription>
						Immutable audit trail of all transactions, modifications, and
						deletions.
					</CardDescription>
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
								) : (
									logs.map((log) => {
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
