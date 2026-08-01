import type { GameRate } from "@level-up/shared";
import { collection, onSnapshot, query } from "firebase/firestore";
import { Loader2 } from "lucide-react";
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
import { auth, db } from "../firebase";
import { handleFirestoreError, OperationType } from "../lib/errorHandler";

export function Admin() {
	const [rates, setRates] = useState<GameRate[]>([]);
	const [gameName, setGameName] = useState("");
	const [price, setPrice] = useState("");
	const [unitType, setUnitType] = useState<"Hour" | "Game">("Hour");
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		const q = query(collection(db, "game_rates"));
		const unsub = onSnapshot(
			q,
			(snap) => {
				setRates(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as GameRate));
			},
			(err) => handleFirestoreError(err, OperationType.LIST, "game_rates"),
		);
		return () => unsub();
	}, []);

	const handleAddRate = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!gameName || !price) return;

		setLoading(true);
		try {
			const token = await auth.currentUser?.getIdToken();
			if (!token) throw new Error("Not authenticated");

			const response = await fetch(
				`http://${window.location.hostname}:4000/api/rates`,
				{
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
				},
			);
			if (!response.ok)
				throw new Error((await response.json()).error || "Failed to add rate");

			setGameName("");
			setPrice("");
			setUnitType("Hour");
			toast.success("Game rate added successfully!");
		} catch (err: unknown) {
			console.error(err);
			toast.error("Failed to add game rate");
		} finally {
			setLoading(false);
		}
	};

	const toggleRateStatus = async (rate: GameRate) => {
		try {
			const token = await auth.currentUser?.getIdToken();
			if (!token) throw new Error("Not authenticated");

			const response = await fetch(
				`http://${window.location.hostname}:4000/api/rates/${rate.id}`,
				{
					method: "PUT",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${token}`,
					},
					body: JSON.stringify({
						isActive: !rate.isActive,
						editReason: `Toggled active status to ${!rate.isActive}`,
					}),
				},
			);
			if (!response.ok)
				throw new Error(
					(await response.json()).error || "Failed to update rate",
				);

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
										setUnitType(e.target.value as "Hour" | "Game")
									}
								>
									<option value="Hour">Per Hour</option>
									<option value="Game">Per Game</option>
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
							<div
								key={rate.id}
								className="flex justify-between items-center p-4 border rounded-md"
							>
								<div>
									<div className="font-medium">{rate.game_name}</div>
									<div className="text-sm text-zinc-500">
										${rate.price_per_unit.toFixed(2)} / {rate.unit_type}
									</div>
								</div>
								<Button
									variant={rate.isActive ? "outline" : "secondary"}
									onClick={() => toggleRateStatus(rate)}
								>
									{rate.isActive ? "Deactivate" : "Activate"}
								</Button>
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
