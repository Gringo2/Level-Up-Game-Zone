import type { GameRate } from "@level-up/shared";
import { UNIT_TYPES } from "@level-up/shared";
import { Loader2, Pencil, X } from "lucide-react";
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
import { auth } from "../firebase";
import { API_BASE, safeJson } from "../lib/api";

interface EditState {
	rateId: string;
	gameName: string;
	price: string;
	unitType: (typeof UNIT_TYPES)[keyof typeof UNIT_TYPES];
	editReason: string;
}

export function Admin() {
	const [rates, setRates] = useState<GameRate[]>([]);
	const [gameName, setGameName] = useState("");
	const [price, setPrice] = useState("");
	const [unitType, setUnitType] = useState<
		(typeof UNIT_TYPES)[keyof typeof UNIT_TYPES]
	>(UNIT_TYPES.HOUR);
	const [loading, setLoading] = useState(false);

	// Inline edit state — null means no row is being edited
	const [editState, setEditState] = useState<EditState | null>(null);
	const [editLoading, setEditLoading] = useState(false);

	useEffect(() => {
		let mounted = true;

		const loadRates = async () => {
			try {
				const token = await auth.currentUser?.getIdToken();
				if (!token) throw new Error("Not authenticated");

				const response = await fetch(`${API_BASE}/api/rates`, {
					headers: {
						Authorization: `Bearer ${token}`,
					},
				});
				if (!response.ok) {
					throw new Error(
						(await safeJson(response)).error || "Failed to fetch rates",
					);
				}

				const data = (await safeJson(response)) as GameRate[];
				if (mounted) {
					setRates(data);
				}
			} catch (err) {
				console.error(err);
				toast.error("Failed to load rates");
			}
		};

		void loadRates();
		return () => {
			mounted = false;
		};
	}, []);

	const handleAddRate = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!gameName || !price) return;

		setLoading(true);
		try {
			const token = await auth.currentUser?.getIdToken();
			if (!token) throw new Error("Not authenticated");

			const response = await fetch(`${API_BASE}/api/rates`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({
					game_name: gameName,
					price_per_unit: price,
					unit_type: unitType,
					isActive: true,
				}),
			});
			if (!response.ok)
				throw new Error(
					(await safeJson(response)).error || "Failed to add rate",
				);

			const newRate = (await safeJson(response)) as GameRate;
			setRates((prev) => [...prev, newRate]);
			setGameName("");
			setPrice("");
			setUnitType(UNIT_TYPES.HOUR);
			toast.success("Game rate added successfully!");
		} catch (err: unknown) {
			console.error(err);
			toast.error("Failed to add game rate");
		} finally {
			setLoading(false);
		}
	};

	const startEdit = (rate: GameRate) => {
		setEditState({
			rateId: rate.id,
			gameName: rate.game_name,
			price: String(rate.price_per_unit),
			unitType: rate.unit_type as (typeof UNIT_TYPES)[keyof typeof UNIT_TYPES],
			editReason: "",
		});
	};

	const cancelEdit = () => setEditState(null);

	const handleSaveEdit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!editState) return;
		if (!editState.editReason.trim()) {
			toast.error("Edit reason is required.");
			return;
		}

		setEditLoading(true);
		try {
			const token = await auth.currentUser?.getIdToken();
			if (!token) throw new Error("Not authenticated");

			const response = await fetch(
				`${API_BASE}/api/rates/${editState.rateId}`,
				{
					method: "PUT",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${token}`,
					},
					body: JSON.stringify({
						game_name: editState.gameName,
						price_per_unit: editState.price,
						unit_type: editState.unitType,
						editReason: editState.editReason,
					}),
				},
			);
			if (!response.ok)
				throw new Error(
					(await safeJson(response)).error || "Failed to update rate",
				);

			const updated = (await safeJson(response)) as GameRate;
			setRates((prev) =>
				prev.map((r) => (r.id === editState.rateId ? updated : r)),
			);
			setEditState(null);
			toast.success("Rate updated successfully!");
		} catch (err: unknown) {
			console.error(err);
			toast.error("Failed to update rate");
		} finally {
			setEditLoading(false);
		}
	};

	const toggleRateStatus = async (rate: GameRate) => {
		try {
			const token = await auth.currentUser?.getIdToken();
			if (!token) throw new Error("Not authenticated");

			const response = await fetch(`${API_BASE}/api/rates/${rate.id}`, {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({
					isActive: !rate.isActive,
					editReason: `Toggled active status to ${!rate.isActive}`,
				}),
			});
			if (!response.ok)
				throw new Error(
					(await safeJson(response)).error || "Failed to update rate",
				);

			const updated = (await safeJson(response)) as GameRate;
			setRates((prev) => prev.map((r) => (r.id === rate.id ? updated : r)));
			toast.success(`Rate ${rate.isActive ? "deactivated" : "activated"}`);
		} catch (err: unknown) {
			console.error(err);
			toast.error("Failed to update rate status");
		}
	};

	return (
		<div className="space-y-6">
			<h2 className="text-2xl font-bold tracking-tight">Admin Settings</h2>

			<Card className="max-w-xl">
				<form onSubmit={handleAddRate}>
					<CardHeader>
						<CardTitle>Add Game Rate</CardTitle>
						<CardDescription>
							Define pricing for games and tables.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
							<div className="space-y-2">
								<Label htmlFor="gameName">Game Name</Label>
								<Input
									id="gameName"
									placeholder="e.g., PS4, Pool Table 1"
									value={gameName}
									onChange={(e) => setGameName(e.target.value)}
									required
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="price">Price ($)</Label>
								<Input
									id="price"
									type="number"
									step="0.01"
									min="0"
									value={price}
									onChange={(e) => setPrice(e.target.value)}
									required
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="unit">Unit</Label>
								<select
									id="unit"
									className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2"
									value={unitType}
									onChange={(e) =>
										setUnitType(
											e.target
												.value as (typeof UNIT_TYPES)[keyof typeof UNIT_TYPES],
										)
									}
								>
									<option value={UNIT_TYPES.HOUR}>Per Hour</option>
									<option value={UNIT_TYPES.GAME}>Per Game</option>
								</select>
							</div>
						</div>
					</CardContent>
					<CardFooter>
						<Button type="submit" disabled={loading || !gameName || !price}>
							{loading ? (
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
							) : null}
							Add Rate
						</Button>
					</CardFooter>
				</form>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Current Rates</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="space-y-4">
						{rates.map((rate) => (
							<div key={rate.id}>
								{editState?.rateId === rate.id ? (
									/* ── Inline Edit Form ── */
									<form
										onSubmit={handleSaveEdit}
										className="p-4 border border-zinc-300 rounded-md bg-zinc-50 space-y-4"
									>
										<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
											<div className="space-y-2">
												<Label htmlFor={`edit-name-${rate.id}`}>
													Game Name
												</Label>
												<Input
													id={`edit-name-${rate.id}`}
													value={editState.gameName}
													onChange={(e) =>
														setEditState((s) =>
															s ? { ...s, gameName: e.target.value } : s,
														)
													}
													required
												/>
											</div>
											<div className="space-y-2">
												<Label htmlFor={`edit-price-${rate.id}`}>
													Price ($)
												</Label>
												<Input
													id={`edit-price-${rate.id}`}
													type="number"
													step="0.01"
													min="0"
													value={editState.price}
													onChange={(e) =>
														setEditState((s) =>
															s ? { ...s, price: e.target.value } : s,
														)
													}
													required
												/>
											</div>
											<div className="space-y-2">
												<Label htmlFor={`edit-unit-${rate.id}`}>Unit</Label>
												<select
													id={`edit-unit-${rate.id}`}
													className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2"
													value={editState.unitType}
													onChange={(e) =>
														setEditState((s) =>
															s
																? {
																		...s,
																		unitType: e.target
																			.value as (typeof UNIT_TYPES)[keyof typeof UNIT_TYPES],
																	}
																: s,
														)
													}
												>
													<option value={UNIT_TYPES.HOUR}>Per Hour</option>
													<option value={UNIT_TYPES.GAME}>Per Game</option>
												</select>
											</div>
										</div>
										<div className="space-y-2">
											<Label htmlFor={`edit-reason-${rate.id}`}>
												Reason for Change{" "}
												<span className="text-red-500">*</span>
											</Label>
											<Input
												id={`edit-reason-${rate.id}`}
												placeholder="e.g., Price increase effective August 2026"
												value={editState.editReason}
												onChange={(e) =>
													setEditState((s) =>
														s ? { ...s, editReason: e.target.value } : s,
													)
												}
												required
											/>
										</div>
										<div className="flex gap-2">
											<Button
												type="submit"
												disabled={editLoading || !editState.editReason.trim()}
											>
												{editLoading ? (
													<Loader2 className="mr-2 h-4 w-4 animate-spin" />
												) : null}
												Save Changes
											</Button>
											<Button
												type="button"
												variant="outline"
												onClick={cancelEdit}
											>
												<X className="mr-1 h-4 w-4" />
												Cancel
											</Button>
										</div>
									</form>
								) : (
									/* ── Read-Only Row ── */
									<div className="flex justify-between items-center p-4 border rounded-md">
										<div>
											<div className="font-medium">{rate.game_name}</div>
											<div className="text-sm text-zinc-500">
												${rate.price_per_unit.toFixed(2)} / {rate.unit_type}
											</div>
										</div>
										<div className="flex gap-2">
											<Button
												variant="outline"
												size="sm"
												onClick={() => startEdit(rate)}
											>
												<Pencil className="h-4 w-4 mr-1" />
												Edit
											</Button>
											<Button
												variant={rate.isActive ? "outline" : "secondary"}
												size="sm"
												onClick={() => toggleRateStatus(rate)}
											>
												{rate.isActive ? "Deactivate" : "Activate"}
											</Button>
										</div>
									</div>
								)}
							</div>
						))}
						{rates.length === 0 && (
							<div className="text-center text-zinc-500 py-4">
								No rates defined yet.
							</div>
						)}
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
