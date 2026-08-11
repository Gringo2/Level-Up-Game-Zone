import { Loader2, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { auth } from "../firebase";
import { API_BASE, safeJson } from "../lib/api";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

interface AppUser {
	uid: string;
	email: string;
	displayName: string;
	role: "admin" | "manager" | "staff";
}

export function UserManagement() {
	const [users, setUsers] = useState<AppUser[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		let mounted = true;
		const loadUsers = async () => {
			try {
				const token = await auth.currentUser?.getIdToken();
				if (!token) throw new Error("Not authenticated");

				const response = await fetch(`${API_BASE}/api/users`, {
					headers: {
						Authorization: `Bearer ${token}`,
					},
				});
				if (!response.ok) {
					throw new Error(
						(await safeJson(response)).error || "Failed to fetch users",
					);
				}

				const data = (await safeJson(response)) as AppUser[];
				if (mounted) {
					setUsers(data);
					setLoading(false);
				}
			} catch (err) {
				console.error(err);
				if (mounted) {
					toast.error("Failed to load users");
					setLoading(false);
				}
			}
		};

		void loadUsers();
		return () => {
			mounted = false;
		};
	}, []);

	const handleUpdateRole = async (
		user: AppUser,
		newRole: "admin" | "manager" | "staff",
	) => {
		try {
			const token = await auth.currentUser?.getIdToken();
			if (!token) throw new Error("Not authenticated");

			const oldRole = user.role;
			const response = await fetch(`${API_BASE}/api/users/${user.uid}/role`, {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({
					role: newRole,
					editReason: `Role updated from ${oldRole} to ${newRole}`,
				}),
			});

			if (!response.ok)
				throw new Error(
					(await safeJson(response)).error || "Failed to update role",
				);

			toast.success("Role updated successfully!");
		} catch (err: unknown) {
			console.error(err);
			toast.error("Failed to update role.");
		}
	};

	if (loading)
		return (
			<div className="p-8 text-center">
				<Loader2 className="animate-spin mx-auto" />
			</div>
		);

	return (
		<div className="space-y-6">
			<h2 className="text-2xl font-bold tracking-tight">User Management</h2>
			<Card>
				<CardHeader>
					<CardTitle>Staff Accounts</CardTitle>
				</CardHeader>
				<CardContent>
					<table className="w-full text-sm text-left">
						<thead className="text-xs text-zinc-500 uppercase bg-zinc-50 border-b">
							<tr>
								<th className="px-4 py-3 font-medium">Name</th>
								<th className="px-4 py-3 font-medium">Email</th>
								<th className="px-4 py-3 font-medium">Role</th>
								<th className="px-4 py-3 font-medium text-right">Actions</th>
							</tr>
						</thead>
						<tbody className="divide-y">
							{users.map((user) => (
								<tr key={user.uid} className="border-b last:border-0">
									<td className="px-4 py-3">{user.displayName}</td>
									<td className="px-4 py-3">{user.email}</td>
									<td className="px-4 py-3">
										<select
											value={user.role}
											onChange={(e) =>
												// biome-ignore lint/suspicious/noExplicitAny: DOM event value
												handleUpdateRole(user, e.target.value as any)
											}
											className="bg-zinc-50 border border-zinc-300 text-zinc-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
										>
											<option value="admin">Admin</option>
											<option value="manager">Manager</option>
											<option value="staff">Staff</option>
										</select>
									</td>
									<td className="px-4 py-3 text-right">
										<Button
											variant="ghost"
											size="sm"
											className="text-red-600 hover:text-red-800"
										>
											<Trash2 className="h-4 w-4" />
										</Button>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</CardContent>
			</Card>
		</div>
	);
}
