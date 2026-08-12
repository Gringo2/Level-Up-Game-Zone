import { signOut } from "firebase/auth";
import {
	BarChart,
	ClipboardList,
	Coins,
	CreditCard,
	Gamepad2,
	LayoutDashboard,
	LogOut,
	Receipt,
	Settings,
	UserCog,
	Users,
} from "lucide-react";
import type React from "react";
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
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
import { useShift } from "../contexts/ShiftContext";
import { auth } from "../firebase";
import { API_BASE, safeJson } from "../lib/api";

export function Layout({ children }: { children: React.ReactNode }) {
	const { user } = useAuth();
	const { activeShift, loadingShift, refetchShift } = useShift();
	const location = useLocation();
	const [openingFloat, setOpeningFloat] = useState("");

	const handleStartShift = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!openingFloat || !user) return;
		try {
			const token = await auth.currentUser?.getIdToken();
			if (!token) throw new Error("Not authenticated");

			const response = await fetch(`${API_BASE}/api/shifts`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({
					floatAmount: openingFloat,
					managerName: user.displayName || user.email,
				}),
			});
			if (!response.ok)
				throw new Error(
					(await safeJson(response)).error || "Failed to start shift",
				);

			setOpeningFloat("");
			await refetchShift();
			toast.success("Shift started!");
		} catch (err: unknown) {
			console.error(err);
			toast.error("Failed to start shift");
		}
	};

	const navItems = [
		{
			path: "/",
			label: "Dashboard",
			icon: LayoutDashboard,
			roles: ["admin", "manager", "staff"],
		},
		{
			path: "/games",
			label: "Game Sales",
			icon: Gamepad2,
			roles: ["admin", "manager", "staff"],
		},
		{ path: "/keno", label: "Keno", icon: Coins, roles: ["admin", "manager"] },
		{
			path: "/credits",
			label: "Credits (IOUs)",
			icon: CreditCard,
			roles: ["admin", "manager"],
		},
		{
			path: "/expenses",
			label: "Expenses",
			icon: Receipt,
			roles: ["admin", "manager"],
		},
		{
			path: "/salary-report",
			label: "Salary Report",
			icon: Users,
			roles: ["admin", "manager"],
		},
		{
			path: "/reports",
			label: "Reports",
			icon: BarChart,
			roles: ["admin", "manager"],
		},
		{
			path: "/admin/employees",
			label: "Employee Roster",
			icon: UserCog,
			roles: ["admin", "manager"],
		},
		{
			path: "/audit-logs",
			label: "Activity Log",
			icon: ClipboardList,
			roles: ["admin"],
		},
		{
			path: "/admin/users",
			label: "User Management",
			icon: UserCog,
			roles: ["admin"],
		},
		{ path: "/admin", label: "Admin", icon: Settings, roles: ["admin"] },
	];

	return (
		<div className="min-h-screen bg-zinc-50 flex flex-col md:flex-row">
			{/* Sidebar */}
			<aside className="w-full md:w-64 bg-zinc-900 text-zinc-300 flex flex-col">
				<div className="p-4 md:p-6 border-b border-zinc-800">
					<h1 className="text-xl font-bold text-white">Game Zone</h1>
					<p className="text-xs text-zinc-500 mt-1">
						{user?.displayName} ({user?.role})
					</p>
				</div>
				<nav className="flex-1 p-4 space-y-1 overflow-y-auto">
					{navItems
						.filter((item) => item.roles.includes(user?.role || ""))
						.map((item) => {
							const Icon = item.icon;
							const isActive = location.pathname === item.path;
							return (
								<Link
									key={item.path}
									to={item.path}
									className={`flex items-center space-x-3 px-3 py-2 rounded-md transition-colors ${
										isActive
											? "bg-zinc-800 text-white"
											: "hover:bg-zinc-800 hover:text-white"
									}`}
								>
									<Icon size={18} />
									<span className="text-sm font-medium">{item.label}</span>
								</Link>
							);
						})}
				</nav>
				<div className="p-4 border-t border-zinc-800">
					<Button
						variant="ghost"
						className="w-full justify-start text-zinc-400 hover:text-white hover:bg-zinc-800"
						onClick={() => signOut(auth)}
					>
						<LogOut size={18} className="mr-3" />
						Sign Out
					</Button>
				</div>
			</aside>

			{/* Main Content */}
			<main className="flex-1 p-4 md:p-8 overflow-y-auto relative">
				{!loadingShift &&
					!activeShift &&
					(user?.role === "manager" || user?.role === "admin") && (
						<div className="absolute inset-0 z-50 bg-zinc-900/50 backdrop-blur-sm flex items-center justify-center p-4">
							<Card className="max-w-md w-full shadow-2xl">
								<form onSubmit={handleStartShift}>
									<CardHeader>
										<CardTitle>Open Shift</CardTitle>
										<CardDescription>
											Enter the opening float (cash in drawer) to begin the day.
										</CardDescription>
									</CardHeader>
									<CardContent>
										<div className="space-y-2">
											<Label htmlFor="modal-float">Opening Float ($)</Label>
											<Input
												id="modal-float"
												type="number"
												step="0.01"
												min="0"
												value={openingFloat}
												onChange={(e) => setOpeningFloat(e.target.value)}
												required
												autoFocus
											/>
										</div>
									</CardContent>
									<CardFooter>
										<Button type="submit" className="w-full">
											Start Shift
										</Button>
									</CardFooter>
								</form>
							</Card>
						</div>
					)}
				<div className="max-w-5xl mx-auto">{children}</div>
			</main>
		</div>
	);
}
