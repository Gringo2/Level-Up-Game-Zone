import type { KenoLog } from "@level-up/shared";
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

export function Keno() {
	const { user } = useAuth();
	const [sales, setSales] = useState("");
	const [payouts, setPayouts] = useState("");
	const [loading, setLoading] = useState(false);
	const [logs, setLogs] = useState<KenoLog[]>([]);
	const [editingId, setEditingId] = useState<string | null>(null);
	const [deletingId, setDeletingId] = useState<string | null>(null);
	const [editReason, setEditReason] = useState("");
	const [deleteReason, setDeleteReason] = useState("");

	useEffect(() => {
		let mounted = true;

		const loadKenoLogs = async () => {
			try {
				const token = await auth.currentUser?.getIdToken();
				if (!token) throw new Error("Not authenticated");

				const response = await fetch(`${API_BASE}/api/keno`, {
					headers: {
						Authorization: `Bearer ${token}`,
					},
				});
				if (!response.ok) {
					throw new Error(
						(await safeJson(response)).error || "Failed to fetch keno logs",
					);
				}

				const dayStart = getShopStartOfDay().toISOString();
				const dayEnd = getShopEndOfDay().toISOString();
				const data = (await safeJson(response)) as KenoLog[];
				const fetchedLogs = data
					.filter((log) => log.date >= dayStart && log.date <= dayEnd)
					.sort(
						(a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
					);

				if (mounted) {
					setLogs(fetchedLogs);
				}
			} catch (err) {
				console.error(err);
				if (mounted) {
					toast.error("Failed to load keno logs");
				}
			}
		};

		void loadKenoLogs();
		return () => {
			mounted = false;
		};
	}, []);

	const netProfit = parseFloat(sales || "0") - parseFloat(payouts || "0");

	const handleEdit = (log: KenoLog) => {
		setEditingId(log.id);
		setSales(log.sales.toString());
		setPayouts(log.payouts.toString());
		window.scrollTo({ top: 0, behavior: "smooth" });
	};

	const cancelEdit = () => {
		setEditingId(null);
		setSales("");
		setPayouts("");
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

			const response = await fetch(`${API_BASE}/api/keno/${id}`, {
				method: "DELETE",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
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
			toast.error("Failed to delete keno log");
		}
	};

	const handleVerify = async (id: string) => {
		try {
			const token = await auth.currentUser?.getIdToken();
			if (!token) throw new Error("Not authenticated");

			const response = await fetch(`${API_BASE}/api/keno/${id}/verify`, {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
			});
			if (!response.ok)
				throw new Error((await safeJson(response)).error || "Failed to verify");

			toast.success("Log verified!");
			setLogs((prev) =>
				prev.map((l) => (l.id === id ? { ...l, verified: true } : l)),
			);
		} catch (err: unknown) {
			console.error(err);
			toast.error("Failed to verify keno log");
		}
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!sales || !payouts || !user) return;

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
				const response = await fetch(`${API_BASE}/api/keno/${editingId}`, {
					method: "PUT",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${token}`,
					},
					body: JSON.stringify({
						sales: sales,
						payouts: payouts,
						net_profit: netProfit,
						editReason,
					}),
				});
				if (!response.ok)
					throw new Error(
						(await safeJson(response)).error || "Failed to update",
					);
				toast.success("Keno log updated successfully!");
				setLogs((prev) =>
					prev.map((l) =>
						l.id === editingId
							? {
									...l,
									sales: parseFloat(sales),
									payouts: parseFloat(payouts),
									net_profit: netProfit,
								}
							: l,
					),
				);
				cancelEdit();
			} else {
				const response = await fetch(`${API_BASE}/api/keno`, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${token}`,
					},
					body: JSON.stringify({
						sales: sales,
						payouts: payouts,
						net_profit: netProfit,
					}),
				});
				if (!response.ok)
					throw new Error(
						(await safeJson(response)).error || "Failed to log keno",
					);
				const newLog = await safeJson<KenoLog>(response);
				setLogs((prev) => [newLog, ...prev]);
				setSales("");
				setPayouts("");
				toast.success("Keno logged successfully!");
			}
		} catch (err: unknown) {
			console.error(err);
			toast.error("Failed to save keno log");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="space-y-6">
			<h2 className="text-2xl font-bold tracking-tight">Log Keno</h2>
			<Card className="max-w-md">
				<form onSubmit={handleSubmit}>
					<CardHeader>
						<CardTitle>Daily Keno Entry</CardTitle>
						<CardDescription>
							Enter the total sales and payouts from the Keno software.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="sales">Total Sales ($)</Label>
							<Input
								id="sales"
								type="number"
								step="0.01"
								min="0"
								value={sales}
								onChange={(e) => setSales(e.target.value)}
								required
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="payouts">Total Payouts ($)</Label>
							<Input
								id="payouts"
								type="number"
								step="0.01"
								min="0"
								value={payouts}
								onChange={(e) => setPayouts(e.target.value)}
								required
							/>
						</div>
						<div className="p-4 bg-zinc-50 rounded-md border border-zinc-100">
							<div className="text-sm text-zinc-500 mb-1">Net Profit</div>
							<div
								className={`text-3xl font-bold ${netProfit < 0 ? "text-red-500" : "text-emerald-600"}`}
							>
								${netProfit.toFixed(2)}
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
							disabled={
								loading || !sales || !payouts || (!!editingId && !editReason)
							}
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

			<Card className="max-w-2xl">
				<CardHeader>
					<CardTitle>Today's Keno Logs</CardTitle>
					<CardDescription>Recent Keno entries logged today.</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="space-y-3">
						{logs.length === 0 ? (
							<div className="text-center text-zinc-500 py-8">
								No Keno logged today yet.
							</div>
						) : (
							logs.map((log) => (
								<div
									key={log.id}
									className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 border rounded-md bg-white gap-3"
								>
									<div>
										<div className="text-sm text-zinc-500">
											Sales: ${log.sales.toFixed(2)} | Payouts: $
											{log.payouts.toFixed(2)}
										</div>
										<div
											className={`font-semibold ${log.net_profit < 0 ? "text-red-500" : "text-emerald-600"}`}
										>
											Net: ${log.net_profit.toFixed(2)}
										</div>
										<div className="text-xs text-zinc-400 mt-1 flex items-center gap-2">
											{format(new Date(log.date), "h:mm a")}
											{log.verified ? (
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
										{deletingId === log.id ? (
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
														onClick={() => handleDelete(log.id)}
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
												{!log.verified &&
													(user?.role === "manager" ||
														user?.role === "admin") && (
														<Button
															size="sm"
															variant="outline"
															className="text-emerald-600 border-emerald-200 hover:bg-emerald-50"
															onClick={() => handleVerify(log.id)}
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
															onClick={() => handleEdit(log)}
															disabled={!!editingId}
														>
															<Edit2 className="h-4 w-4 mr-1" /> Edit
														</Button>
														<Button
															size="sm"
															variant="ghost"
															className="text-red-600 hover:text-red-700 hover:bg-red-50"
															onClick={() => setDeletingId(log.id)}
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
