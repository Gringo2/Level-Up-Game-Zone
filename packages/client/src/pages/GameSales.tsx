import type { GameRate, GameSalesLog } from "@level-up/shared";
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

export function GameSales() {
	const { user } = useAuth();
	const [rates, setRates] = useState<GameRate[]>([]);
	const [logs, setLogs] = useState<GameSalesLog[]>([]);
	const [selectedRateId, setSelectedRateId] = useState("");
	const [quantity, setQuantity] = useState("");
	const [loading, setLoading] = useState(false);
	const [loadingRates, setLoadingRates] = useState(true);
	const [editingId, setEditingId] = useState<string | null>(null);
	const [deletingId, setDeletingId] = useState<string | null>(null);
	const [editReason, setEditReason] = useState("");
	const [deleteReason, setDeleteReason] = useState("");

	useEffect(() => {
		let mounted = true;

		const loadSalesData = async () => {
			try {
				const token = await auth.currentUser?.getIdToken();
				if (!token) {
					throw new Error("Not authenticated");
				}

				const [ratesResponse, salesResponse] = await Promise.all([
					fetch(`${API_BASE}/api/rates`, {
						headers: {
							Authorization: `Bearer ${token}`,
						},
					}),
					fetch(`${API_BASE}/api/sales`, {
						headers: {
							Authorization: `Bearer ${token}`,
						},
					}),
				]);

				if (!ratesResponse.ok) {
					throw new Error("Failed to fetch rates");
				}
				if (!salesResponse.ok) {
					throw new Error("Failed to fetch sales logs");
				}

				const fetchedRates = await safeJson<GameRate[]>(ratesResponse);
				const fetchedSales = await safeJson<GameSalesLog[]>(salesResponse);
				const start = getShopStartOfDay().toISOString();
				const end = getShopEndOfDay().toISOString();
				const dailySales = fetchedSales.filter(
					(log) => log.date >= start && log.date <= end,
				);

				if (!mounted) return;

				setRates(fetchedRates.filter((rate) => rate.isActive));
				setLogs(
					dailySales.sort(
						(a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
					),
				);
				setLoadingRates(false);
			} catch (err) {
				console.error(err);
				if (mounted) {
					toast.error("Failed to load sales data");
					setLoadingRates(false);
				}
			}
		};

		void loadSalesData();

		return () => {
			mounted = false;
		};
	}, []);

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
		try {
			const token = await auth.currentUser?.getIdToken();
			if (!token) throw new Error("Not authenticated");

			const response = await fetch(`${API_BASE}/api/sales/${id}`, {
				method: "DELETE",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
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
			toast.error("Failed to delete sale");
		}
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!selectedRate || !quantity || !user) return;

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
				const response = await fetch(`${API_BASE}/api/sales/${editingId}`, {
					method: "PUT",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${token}`,
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
				toast.success("Game sale updated successfully!");
				setLogs((prev) =>
					prev.map((l) =>
						l.id === editingId
							? {
									...l,
									game_id: selectedRate.id,
									game_name: selectedRate.game_name,
									quantity_sold: parseFloat(quantity),
									rate_applied: selectedRate.price_per_unit,
									calculated_total: calculatedTotal,
								}
							: l,
					),
				);
				cancelEdit();
			} else {
				const response = await fetch(`${API_BASE}/api/sales`, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${token}`,
					},
					body: JSON.stringify({
						game_id: selectedRate.id,
						game_name: selectedRate.game_name,
						quantity_sold: quantity,
						rate_applied: selectedRate.price_per_unit,
						calculated_total: calculatedTotal,
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
			toast.error("Failed to save sale");
		} finally {
			setLoading(false);
		}
	};

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
						onClick={async () => {
							try {
								const token = await auth.currentUser?.getIdToken();
								if (!token) return;

								await fetch(`${API_BASE}/api/rates`, {
									method: "POST",
									headers: {
										"Content-Type": "application/json",
										Authorization: `Bearer ${token}`,
									},
									body: JSON.stringify({
										game_name: "PS4",
										price_per_unit: 5,
										unit_type: "Hour",
										isActive: true,
									}),
								});
								await fetch(`${API_BASE}/api/rates`, {
									method: "POST",
									headers: {
										"Content-Type": "application/json",
										Authorization: `Bearer ${token}`,
									},
									body: JSON.stringify({
										game_name: "Pool",
										price_per_unit: 2,
										unit_type: "Game",
										isActive: true,
									}),
								});
								toast.success("Default games configured!");
							} catch (_err) {
								toast.error("Failed to configure games");
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
						<CardTitle>Today's Logs</CardTitle>
						<CardDescription>Recent game sales logged today.</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="space-y-3">
							{logs.length === 0 ? (
								<div className="text-center text-zinc-500 py-8">
									No game sales logged today yet.
								</div>
							) : (
								logs.map((log) => (
									<div
										key={log.id}
										className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 border rounded-md bg-white gap-3"
									>
										<div>
											<div className="font-medium">{log.game_name}</div>
											<div className="text-sm text-zinc-500">
												{log.quantity_sold} units @ $
												{log.rate_applied.toFixed(2)} ={" "}
												<span className="font-semibold text-zinc-900">
													${log.calculated_total.toFixed(2)}
												</span>
											</div>
											<div className="text-xs text-zinc-400 mt-1">
												{format(new Date(log.date), "h:mm a")}
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
										</div>
									</div>
								))
							)}
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
