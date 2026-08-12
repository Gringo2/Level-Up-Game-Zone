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
import { API_BASE, safeJson } from "../lib/api";

export interface AuditLog {
	id: string;
	timestamp: string;
	user_email: string;
	action: string;
	table_affected: string;
	reason: string;
	old_data?: Record<string, unknown>;
}

export function AuditLogs() {
	const [logs, setLogs] = useState<AuditLog[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		let mounted = true;

		const loadLogs = async () => {
			try {
				const token = await auth.currentUser?.getIdToken();
				if (!token) throw new Error("Not authenticated");

				const response = await fetch(`${API_BASE}/api/audit-logs`, {
					headers: {
						Authorization: `Bearer ${token}`,
					},
				});
				if (!response.ok) {
					throw new Error(
						(await safeJson(response)).error || "Failed to fetch audit logs",
					);
				}

				const data = await safeJson<AuditLog[]>(response);
				if (mounted) {
					setLogs(data);
					setLoading(false);
				}
			} catch (err) {
				console.error(err);
				if (mounted) {
					toast.error("Failed to load audit logs");
					setLoading(false);
				}
			}
		};

		void loadLogs();
		return () => {
			mounted = false;
		};
	}, []);

	if (loading)
		return (
			<div className="p-8 text-center">
				<Loader2 className="animate-spin mx-auto" />
			</div>
		);

	return (
		<div className="space-y-6 max-w-5xl mx-auto">
			<h2 className="text-2xl font-bold tracking-tight">Activity Log</h2>
			<Card>
				<CardHeader>
					<CardTitle>Recent Activity</CardTitle>
					<CardDescription>
						Track changes and deletions across the system.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="overflow-x-auto">
						<table className="w-full text-sm text-left">
							<thead className="text-xs text-zinc-500 uppercase bg-zinc-50 border-b">
								<tr>
									<th className="px-4 py-3 font-medium">Time</th>
									<th className="px-4 py-3 font-medium">User</th>
									<th className="px-4 py-3 font-medium">Action</th>
									<th className="px-4 py-3 font-medium">Table</th>
									<th className="px-4 py-3 font-medium">Reason</th>
									<th className="px-4 py-3 font-medium">Details</th>
								</tr>
							</thead>
							<tbody className="divide-y">
								{logs.length === 0 ? (
									<tr>
										<td
											colSpan={6}
											className="px-4 py-8 text-center text-zinc-500"
										>
											No activity logs found.
										</td>
									</tr>
								) : (
									logs.map((log) => (
										<tr key={log.id} className="hover:bg-zinc-50">
											<td className="px-4 py-3 whitespace-nowrap text-zinc-500">
												{format(new Date(log.timestamp), "MMM d, yyyy h:mm a")}
											</td>
											<td className="px-4 py-3 font-medium">
												{log.user_email}
											</td>
											<td className="px-4 py-3">
												<span
													className={`px-2 py-1 rounded-full text-xs font-medium ${
														log.action === "UPDATE"
															? "bg-blue-100 text-blue-800"
															: log.action === "DELETE"
																? "bg-red-100 text-red-800"
																: "bg-zinc-100 text-zinc-800"
													}`}
												>
													{log.action}
												</span>
											</td>
											<td className="px-4 py-3 capitalize">
												{log.table_affected.replace("_", " ")}
											</td>
											<td className="px-4 py-3 text-zinc-600">{log.reason}</td>
											<td
												className="px-4 py-3 text-xs text-zinc-500 max-w-xs truncate"
												title={JSON.stringify(log.old_data)}
											>
												{log.action === "UPDATE"
													? "View changes"
													: "View deleted data"}
											</td>
										</tr>
									))
								)}
							</tbody>
						</table>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
