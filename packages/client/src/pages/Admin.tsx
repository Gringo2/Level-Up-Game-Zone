import type {
	BreakDay,
	Employee,
	ExpenseCategory,
	GameRate,
} from "@level-up/shared";
import { UNIT_TYPES } from "@level-up/shared";
import { format } from "date-fns";
import { Edit2, Loader2, Pencil, RotateCcw, Trash2, X } from "lucide-react";
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
import { API_BASE, authFetch, safeJson } from "../lib/api";

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

	// Expense-category management (moved from Expenses, M-73)
	const [allCategories, setAllCategories] = useState<ExpenseCategory[]>([]);
	const [newCategoryName, setNewCategoryName] = useState("");
	const [editingCategoryId, setEditingCategoryId] = useState<string | null>(
		null,
	);
	const [editingCategoryName, setEditingCategoryName] = useState("");
	const [categoryEditReason, setCategoryEditReason] = useState("");
	const [categoryLoading, setCategoryLoading] = useState(false);
	// Employee hiring (moved from EmployeeRoster, M-74)
	const [name, setName] = useState("");
	const [position, setPosition] = useState("");
	const [baseSalary, setBaseSalary] = useState("");
	const [hiredDate, setHiredDate] = useState(
		new Date().toISOString().split("T")[0],
	);
	const [breakDay, setBreakDay] = useState<BreakDay>(null);
	const [submitLoading, setSubmitLoading] = useState(false);

	useEffect(() => {
		let mounted = true;
		const loadCategories = async () => {
			try {
				const res = await authFetch(`${API_BASE}/api/expense-categories`);
				if (res.ok) {
					const cats = (await safeJson(res)) as ExpenseCategory[];
					if (
						mounted &&
						Array.isArray(cats) &&
						cats.every(
							(c) =>
								c && typeof c.id === "string" && typeof c.name === "string",
						)
					) {
						setAllCategories(cats);
					}
				}
			} catch (err) {
				console.error(err);
			}
		};
		void loadCategories();
		return () => {
			mounted = false;
		};
	}, []);

	useEffect(() => {
		let mounted = true;

		const loadRates = async () => {
			try {
				const response = await authFetch(`${API_BASE}/api/rates`);
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
			const response = await authFetch(`${API_BASE}/api/rates`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
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
			const response = await authFetch(
				`${API_BASE}/api/rates/${editState.rateId}`,
				{
					method: "PUT",
					headers: {
						"Content-Type": "application/json",
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
			const response = await authFetch(`${API_BASE}/api/rates/${rate.id}`, {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
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

	const handleCreateCategory = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!newCategoryName.trim()) return;

		setCategoryLoading(true);
		try {
			const response = await authFetch(`${API_BASE}/api/expense-categories`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ name: newCategoryName.trim() }),
			});
			if (!response.ok) {
				const body = await safeJson(response);
				throw new Error(body.error || "Failed to create category");
			}
			const created = await safeJson<ExpenseCategory>(response);
			setAllCategories((prev) => [...prev, created]);
			setNewCategoryName("");
			toast.success("Category created!");
		} catch (err: unknown) {
			console.error(err);
			toast.error(
				err instanceof Error ? err.message : "Failed to create category",
			);
		} finally {
			setCategoryLoading(false);
		}
	};

	const handleUpdateCategory = async (id: string) => {
		if (!editingCategoryName.trim() || !categoryEditReason.trim()) {
			toast.error("Category name and reason are required.");
			return;
		}

		setCategoryLoading(true);
		try {
			const response = await authFetch(
				`${API_BASE}/api/expense-categories/${id}`,
				{
					method: "PUT",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						name: editingCategoryName.trim(),
						editReason: categoryEditReason.trim(),
					}),
				},
			);
			if (!response.ok) {
				const body = await safeJson(response);
				throw new Error(body.error || "Failed to update category");
			}
			const updated = await safeJson<ExpenseCategory>(response);
			setAllCategories((prev) => prev.map((c) => (c.id === id ? updated : c)));
			setEditingCategoryId(null);
			setEditingCategoryName("");
			setCategoryEditReason("");
			toast.success("Category updated!");
		} catch (err: unknown) {
			console.error(err);
			toast.error(
				err instanceof Error ? err.message : "Failed to update category",
			);
		} finally {
			setCategoryLoading(false);
		}
	};

	const handleDeactivateCategory = async (id: string) => {
		setCategoryLoading(true);
		try {
			const response = await authFetch(
				`${API_BASE}/api/expense-categories/${id}`,
				{
					method: "PUT",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						isActive: false,
						editReason: "Deactivated by user",
					}),
				},
			);
			if (!response.ok) {
				const body = await safeJson(response);
				throw new Error(body.error || "Failed to deactivate category");
			}
			setAllCategories((prev) =>
				prev.map((c) => (c.id === id ? { ...c, isActive: false } : c)),
			);
			toast.success("Category deactivated!");
		} catch (err: unknown) {
			console.error(err);
			toast.error(
				err instanceof Error ? err.message : "Failed to deactivate category",
			);
		} finally {
			setCategoryLoading(false);
		}
	};

	const handleActivateCategory = async (id: string) => {
		setCategoryLoading(true);
		try {
			const response = await authFetch(
				`${API_BASE}/api/expense-categories/${id}`,
				{
					method: "PUT",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						isActive: true,
						editReason: "Reactivated by user",
					}),
				},
			);
			if (!response.ok) {
				const body = await safeJson(response);
				throw new Error(body.error || "Failed to activate category");
			}
			setAllCategories((prev) =>
				prev.map((c) => (c.id === id ? { ...c, isActive: true } : c)),
			);
			toast.success("Category activated!");
		} catch (err: unknown) {
			console.error(err);
			toast.error(
				err instanceof Error ? err.message : "Failed to activate category",
			);
		} finally {
			setCategoryLoading(false);
		}
	};

	const handleAddEmployee = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!name || !position || !baseSalary || !hiredDate) return;

		setSubmitLoading(true);
		try {
			const response = await authFetch(`${API_BASE}/api/employees`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					name: name.trim(),
					position: position.trim(),
					base_salary: parseFloat(baseSalary),
					hired_date: hiredDate,
					break_day: breakDay,
				}),
			});

			if (!response.ok) {
				throw new Error(
					(await safeJson(response)).error || "Failed to add employee",
				);
			}

			const newEmployee = (await safeJson(response)) as Employee;

			setName("");
			setPosition("");
			setBaseSalary("");
			setHiredDate(new Date().toISOString().split("T")[0]);
			setBreakDay(null);
			toast.success(`Employee ${newEmployee.name} added to roster!`);
		} catch (err: unknown) {
			console.error(err);
			toast.error((err as Error).message || "Failed to add employee");
		} finally {
			setSubmitLoading(false);
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

			<Card className="max-w-2xl">
				<CardHeader>
					<CardTitle>Manage Categories</CardTitle>
					<CardDescription>
						Create, edit, or deactivate expense categories.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<form onSubmit={handleCreateCategory} className="flex gap-2">
						<Input
							type="text"
							placeholder="New category name"
							value={newCategoryName}
							onChange={(e) => setNewCategoryName(e.target.value)}
							disabled={categoryLoading}
							className="flex-1"
						/>
						<Button
							type="submit"
							disabled={categoryLoading || !newCategoryName.trim()}
						>
							{categoryLoading ? (
								<Loader2 className="h-4 w-4 animate-spin" />
							) : (
								"Add"
							)}
						</Button>
					</form>

					<div className="space-y-2">
						{allCategories.length === 0 ? (
							<div className="text-center text-zinc-500 py-4">
								No categories yet.
							</div>
						) : (
							allCategories.map((cat) => (
								<div
									key={cat.id}
									className="flex items-center gap-2 p-2 border rounded-md bg-white"
								>
									{editingCategoryId === cat.id ? (
										<div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1">
											<Input
												type="text"
												value={editingCategoryName}
												onChange={(e) => setEditingCategoryName(e.target.value)}
												className="flex-1 h-8 text-sm"
												placeholder="Category name"
											/>
											<Input
												type="text"
												value={categoryEditReason}
												onChange={(e) => setCategoryEditReason(e.target.value)}
												className="flex-1 h-8 text-sm"
												placeholder="Reason for change"
											/>
											<div className="flex gap-1">
												<Button
													size="sm"
													onClick={() => handleUpdateCategory(cat.id)}
													disabled={
														categoryLoading ||
														!editingCategoryName.trim() ||
														!categoryEditReason.trim()
													}
												>
													Save
												</Button>
												<Button
													size="sm"
													variant="ghost"
													onClick={() => {
														setEditingCategoryId(null);
														setEditingCategoryName("");
														setCategoryEditReason("");
													}}
												>
													Cancel
												</Button>
											</div>
										</div>
									) : (
										<>
											<span className="flex-1 text-sm">{cat.name}</span>
											{cat.created_at && (
												<span className="text-xs text-zinc-400">
													{format(new Date(cat.created_at), "MMM d, yyyy")}
												</span>
											)}
											<span
												className={`text-xs px-1.5 py-0.5 rounded-sm ${
													cat.isActive
														? "text-emerald-600 bg-emerald-50"
														: "text-zinc-500 bg-zinc-100"
												}`}
											>
												{cat.isActive ? "Active" : "Inactive"}
											</span>
											{cat.isActive ? (
												<>
													<Button
														size="sm"
														variant="ghost"
														onClick={() => {
															setEditingCategoryId(cat.id);
															setEditingCategoryName(cat.name);
															setCategoryEditReason("");
														}}
														disabled={categoryLoading}
													>
														<Edit2 className="h-4 w-4" />
													</Button>
													<Button
														size="sm"
														variant="ghost"
														className="text-red-600 hover:text-red-700 hover:bg-red-50"
														onClick={() => handleDeactivateCategory(cat.id)}
														disabled={categoryLoading}
													>
														<Trash2 className="h-4 w-4" />
													</Button>
												</>
											) : (
												<Button
													size="sm"
													variant="ghost"
													className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
													onClick={() => handleActivateCategory(cat.id)}
													disabled={categoryLoading}
												>
													<RotateCcw className="h-4 w-4" />
												</Button>
											)}
										</>
									)}
								</div>
							))
						)}
					</div>
				</CardContent>
				{/* Add Employee Form */}
				<Card className="max-w-2xl">
					<form onSubmit={handleAddEmployee}>
						<CardHeader>
							<CardTitle>Add Store Employee</CardTitle>
							<CardDescription>
								Register a staff member to enable clean credit logging and
								salary deduction reporting.
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div className="space-y-2">
									<Label htmlFor="name">Full Name</Label>
									<Input
										id="name"
										placeholder="e.g. John Doe"
										value={name}
										onChange={(e) => setName(e.target.value)}
										required
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="position">Position / Role</Label>
									<Input
										id="position"
										placeholder="e.g. Cashier, Floor Attendant"
										value={position}
										onChange={(e) => setPosition(e.target.value)}
										required
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="baseSalary">Base Monthly Salary ($)</Label>
									<Input
										id="baseSalary"
										type="number"
										step="0.01"
										min="0"
										placeholder="e.g. 500.00"
										value={baseSalary}
										onChange={(e) => setBaseSalary(e.target.value)}
										required
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="hiredDate">Date of Hiring</Label>
									<Input
										id="hiredDate"
										type="date"
										value={hiredDate}
										onChange={(e) => setHiredDate(e.target.value)}
										required
									/>
								</div>
								<div className="space-y-2 md:col-span-2">
									<Label htmlFor="breakDay">Break Day (Rest Day)</Label>
									<select
										id="breakDay"
										value={breakDay || ""}
										onChange={(e) =>
											setBreakDay((e.target.value as BreakDay) || null)
										}
										className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950"
									>
										<option value="">None / Flexible</option>
										<option value="Monday">Monday</option>
										<option value="Tuesday">Tuesday</option>
										<option value="Wednesday">Wednesday</option>
										<option value="Thursday">Thursday</option>
										<option value="Friday">Friday</option>
										<option value="Saturday">Saturday</option>
										<option value="Sunday">Sunday</option>
									</select>
								</div>
							</div>
							<Button
								type="submit"
								disabled={submitLoading || !name || !position}
							>
								{submitLoading ? (
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								) : null}
								Add Employee
							</Button>
						</CardContent>
					</form>
				</Card>
			</Card>
		</div>
	);
}
