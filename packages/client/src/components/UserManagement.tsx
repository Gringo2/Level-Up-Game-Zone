import { ROLES } from "@level-up/shared";
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
	role: (typeof ROLES)[keyof typeof ROLES];
}

export function UserManagement() {
	const [users, setUsers] = useState<AppUser[]>([]);
	const [loading, setLoading] = useState(true);

	const [inviteEmail, setInviteEmail] = useState("");
	const [inviteRole, setInviteRole] = useState<
		(typeof ROLES)[keyof typeof ROLES]
	>(ROLES.STAFF);
	const [inviteLoading, setInviteLoading] = useState(false);

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
		newRole: (typeof ROLES)[keyof typeof ROLES],
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
			setUsers((prev) =>
				prev.map((u) => (u.uid === user.uid ? { ...u, role: newRole } : u)),
			);
		} catch (err: unknown) {
			console.error(err);
			toast.error("Failed to update role.");
		}
	};

	const handleDeleteUser = async (targetUser: AppUser) => {
		if (
			!window.confirm(
				`Are you sure you want to delete user ${targetUser.displayName || targetUser.email}?`,
			)
		) {
			return;
		}

		try {
			const token = await auth.currentUser?.getIdToken();
			if (!token) throw new Error("Not authenticated");

			const response = await fetch(`${API_BASE}/api/users/${targetUser.uid}`, {
				method: "DELETE",
				headers: {
					Authorization: `Bearer ${token}`,
				},
			});

			if (!response.ok) {
				throw new Error(
					(await safeJson(response)).error || "Failed to delete user",
				);
			}

			toast.success("User account deleted successfully!");
			setUsers((prev) => prev.filter((u) => u.uid !== targetUser.uid));
		} catch (err: unknown) {
			console.error(err);
			toast.error((err as Error).message || "Failed to delete user");
		}
	};

	const handleInvite = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!inviteEmail) return;

		setInviteLoading(true);
		try {
			const token = await auth.currentUser?.getIdToken();
			if (!token) throw new Error("Not authenticated");

			const response = await fetch(`${API_BASE}/api/users/invite`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({
					email: inviteEmail.toLowerCase(),
					role: inviteRole,
				}),
			});

			if (!response.ok) {
				throw new Error(
					(await safeJson(response)).error || "Failed to invite user",
				);
			}

			toast.success(`User ${inviteEmail} invited as ${inviteRole}!`);
			setInviteEmail("");
			setInviteRole(ROLES.STAFF);
		} catch (err: unknown) {
			console.error(err);
			toast.error((err as Error).message || "Failed to invite user");
		} finally {
			setInviteLoading(false);
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

			<Card className="max-w-xl">
				<form onSubmit={handleInvite}>
					<CardHeader>
						<CardTitle>Invite Employee</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="flex gap-4">
							<div className="flex-1">
								<input
									type="email"
									placeholder="Email address"
									required
									value={inviteEmail}
									onChange={(e) => setInviteEmail(e.target.value)}
									className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950"
								/>
							</div>
							<div className="w-32">
								<select
									value={inviteRole}
									onChange={(e) =>
										setInviteRole(
											e.target.value as (typeof ROLES)[keyof typeof ROLES],
										)
									}
									className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950"
								>
									<option value={ROLES.ADMIN}>Admin</option>
									<option value={ROLES.MANAGER}>Manager</option>
									<option value={ROLES.STAFF}>Staff</option>
								</select>
							</div>
							<Button type="submit" disabled={inviteLoading || !inviteEmail}>
								{inviteLoading ? (
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								) : null}
								Invite
							</Button>
						</div>
					</CardContent>
				</form>
			</Card>

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
											<option value={ROLES.ADMIN}>Admin</option>
											<option value={ROLES.MANAGER}>Manager</option>
											<option value={ROLES.STAFF}>Staff</option>
										</select>
									</td>
									<td className="px-4 py-3 text-right">
										<Button
											variant="ghost"
											size="sm"
											className="text-red-600 hover:text-red-800"
											onClick={() => handleDeleteUser(user)}
											title="Delete user account"
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
