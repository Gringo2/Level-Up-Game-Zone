import type { BreakDay, Employee } from "@level-up/shared";
import { ROLES } from "@level-up/shared";
import { format } from "date-fns";
import { Edit2, Loader2, UserCheck, UserX, X } from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { useAuth } from "../contexts/AuthContext";
import { API_BASE, authFetch, safeJson } from "../lib/api";

interface EditState {
	id: string;
	name: string;
	position: string;
	baseSalary: string;
	hiredDate: string;
	breakDay: BreakDay;
	editReason: string;
}

export function EmployeeRoster() {
	const { user } = useAuth();
	const [employees, setEmployees] = useState<Employee[]>([]);
	const [loading, setLoading] = useState(true);

	// Form State

	// Edit State
	const [editState, setEditState] = useState<EditState | null>(null);
	const [editLoading, setEditLoading] = useState(false);

	useEffect(() => {
		let mounted = true;
		const loadEmployees = async () => {
			try {
				const response = await authFetch(`${API_BASE}/api/employees`);
				if (!response.ok) {
					throw new Error(
						(await safeJson(response)).error || "Failed to fetch employees",
					);
				}

				const data = (await safeJson(response)) as Employee[];
				if (mounted) {
					setEmployees(data.sort((a, b) => a.name.localeCompare(b.name)));
					setLoading(false);
				}
			} catch (err: unknown) {
				console.error(err);
				if (mounted) {
					toast.error("Failed to load employee roster");
					setLoading(false);
				}
			}
		};

		void loadEmployees();
		return () => {
			mounted = false;
		};
	}, []);

	const startEdit = (emp: Employee) => {
		setEditState({
			id: emp.id,
			name: emp.name,
			position: emp.position,
			baseSalary: emp.base_salary.toString(),
			hiredDate: emp.hired_date,
			breakDay: emp.break_day,
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
				`${API_BASE}/api/employees/${editState.id}`,
				{
					method: "PUT",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						name: editState.name.trim(),
						position: editState.position.trim(),
						base_salary: parseFloat(editState.baseSalary),
						hired_date: editState.hiredDate,
						break_day: editState.breakDay,
						editReason: editState.editReason.trim(),
					}),
				},
			);

			if (!response.ok) {
				throw new Error(
					(await safeJson(response)).error || "Failed to update employee",
				);
			}

			const updated = (await safeJson(response)) as Employee;
			setEmployees((prev) =>
				prev.map((emp) => (emp.id === editState.id ? updated : emp)),
			);

			setEditState(null);
			toast.success("Employee record updated!");
		} catch (err: unknown) {
			console.error(err);
			toast.error((err as Error).message || "Failed to update employee");
		} finally {
			setEditLoading(false);
		}
	};

	const toggleActiveStatus = async (emp: Employee) => {
		try {
			const newStatus = !emp.isActive;
			const response = await authFetch(`${API_BASE}/api/employees/${emp.id}`, {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					isActive: newStatus,
					editReason: `Status changed to ${newStatus ? "Active" : "Inactive"}`,
				}),
			});

			if (!response.ok) {
				throw new Error(
					(await safeJson(response)).error || "Failed to update status",
				);
			}

			setEmployees((prev) =>
				prev.map((e) => (e.id === emp.id ? { ...e, isActive: newStatus } : e)),
			);

			toast.success(
				`${emp.name} marked as ${newStatus ? "Active" : "Inactive"}`,
			);
		} catch (err: unknown) {
			console.error(err);
			toast.error("Failed to update active status");
		}
	};

	if (loading)
		return (
			<div className="p-8 text-center">
				<Loader2 className="animate-spin mx-auto text-zinc-400" />
			</div>
		);

	return (
		<div className="space-y-6">
			<div>
				<h2 className="text-2xl font-bold tracking-tight">Employee Roster</h2>
				<p className="text-zinc-500">
					Manage store staff records for salary reconciliation and IOU tracking.
				</p>
			</div>

			{/* Roster Table */}
			<Card>
				<CardHeader>
					<CardTitle>Current Staff Roster</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="space-y-4">
						{employees.map((emp) => (
							<div key={emp.id}>
								{editState?.id === emp.id ? (
									/* Inline Edit Form */
									<form
										onSubmit={handleSaveEdit}
										className="p-4 border border-zinc-300 rounded-md bg-zinc-50 space-y-4"
									>
										<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
											<div className="space-y-2">
												<Label>Full Name</Label>
												<Input
													value={editState.name}
													onChange={(e) =>
														setEditState((s) =>
															s ? { ...s, name: e.target.value } : s,
														)
													}
													required
												/>
											</div>
											<div className="space-y-2">
												<Label>Position</Label>
												<Input
													value={editState.position}
													onChange={(e) =>
														setEditState((s) =>
															s ? { ...s, position: e.target.value } : s,
														)
													}
													required
												/>
											</div>
											<div className="space-y-2">
												<Label>Base Salary ($)</Label>
												<Input
													type="number"
													step="0.01"
													min="0"
													value={editState.baseSalary}
													onChange={(e) =>
														setEditState((s) =>
															s ? { ...s, baseSalary: e.target.value } : s,
														)
													}
													required
												/>
											</div>
											<div className="space-y-2">
												<Label>Date of Hiring</Label>
												<Input
													type="date"
													value={editState.hiredDate}
													onChange={(e) =>
														setEditState((s) =>
															s ? { ...s, hiredDate: e.target.value } : s,
														)
													}
													required
												/>
											</div>
											<div className="space-y-2 md:col-span-2">
												<Label>Break Day</Label>
												<select
													value={editState.breakDay || ""}
													onChange={(e) =>
														setEditState((s) =>
															s
																? {
																		...s,
																		breakDay:
																			(e.target.value as BreakDay) || null,
																	}
																: s,
														)
													}
													className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm"
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
										<div className="space-y-2">
											<Label className="text-amber-600">
												Reason for Edit <span className="text-red-500">*</span>
											</Label>
											<Input
												placeholder="e.g. Salary adjustment / Promotion"
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
												<X className="mr-1 h-4 w-4" /> Cancel
											</Button>
										</div>
									</form>
								) : (
									/* Read-Only Row */
									<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 border rounded-md bg-white gap-3">
										<div>
											<div className="flex items-center gap-2">
												<span className="font-medium text-lg">{emp.name}</span>
												<span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 font-medium">
													{emp.position}
												</span>
												<span
													className={`text-xs px-2 py-0.5 rounded-full font-medium ${
														emp.isActive
															? "bg-emerald-100 text-emerald-800"
															: "bg-red-100 text-red-800"
													}`}
												>
													{emp.isActive ? "Active" : "Inactive"}
												</span>
											</div>
											<div className="text-sm text-zinc-500 mt-1 flex flex-wrap gap-4">
												<span>Base Salary: ${emp.base_salary.toFixed(2)}</span>
												<span>
													Hired:{" "}
													{emp.hired_date
														? format(new Date(emp.hired_date), "MMM d, yyyy")
														: "N/A"}
												</span>
												<span>Break Day: {emp.break_day || "None"}</span>
												<span>
													Added:{" "}
													{format(new Date(emp.created_at), "MMM d, yyyy")}
												</span>
											</div>
										</div>
										{user?.role === ROLES.ADMIN && (
											<div className="flex gap-2">
												<Button
													variant="outline"
													size="sm"
													onClick={() => startEdit(emp)}
												>
													<Edit2 className="h-4 w-4 mr-1" /> Edit
												</Button>
												<Button
													variant={emp.isActive ? "outline" : "secondary"}
													size="sm"
													onClick={() => toggleActiveStatus(emp)}
												>
													{emp.isActive ? (
														<>
															<UserX className="h-4 w-4 mr-1 text-red-500" />
															Deactivate
														</>
													) : (
														<>
															<UserCheck className="h-4 w-4 mr-1 text-emerald-500" />
															Activate
														</>
													)}
												</Button>
											</div>
										)}
									</div>
								)}
							</div>
						))}
						{employees.length === 0 && (
							<div className="text-center text-zinc-500 py-8">
								No employees registered in the roster yet.
							</div>
						)}
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
