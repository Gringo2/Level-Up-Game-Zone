import { ROLES } from "@level-up/shared";
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
import { Link, useLocation } from "react-router-dom";
import { Button } from "../components/ui/button";
import { useAuth } from "../contexts/AuthContext";
import { auth } from "../firebase";

export function Layout({ children }: { children: React.ReactNode }) {
	const { user } = useAuth();
	const location = useLocation();

	const navItems = [
		{
			path: "/",
			label: "Dashboard",
			icon: LayoutDashboard,
			roles: [ROLES.ADMIN, ROLES.MANAGER, ROLES.STAFF],
		},
		{
			path: "/games",
			label: "Game Sales",
			icon: Gamepad2,
			roles: [ROLES.ADMIN, ROLES.MANAGER, ROLES.STAFF],
		},
		{
			path: "/keno",
			label: "Keno",
			icon: Coins,
			roles: [ROLES.ADMIN, ROLES.MANAGER],
		},
		{
			path: "/credits",
			label: "Credits (IOUs)",
			icon: CreditCard,
			roles: [ROLES.ADMIN, ROLES.MANAGER],
		},
		{
			path: "/expenses",
			label: "Expenses",
			icon: Receipt,
			roles: [ROLES.ADMIN, ROLES.MANAGER],
		},
		{
			path: "/salary-report",
			label: "Salary Report",
			icon: Users,
			roles: [ROLES.ADMIN, ROLES.MANAGER],
		},
		{
			path: "/reports",
			label: "Reports",
			icon: BarChart,
			roles: [ROLES.ADMIN, ROLES.MANAGER],
		},
		{
			path: "/admin/employees",
			label: "Employee Roster",
			icon: UserCog,
			roles: [ROLES.ADMIN, ROLES.MANAGER],
		},
		{
			path: "/audit-logs",
			label: "Activity Log",
			icon: ClipboardList,
			roles: [ROLES.ADMIN],
		},
		{
			path: "/admin/users",
			label: "User Management",
			icon: UserCog,
			roles: [ROLES.ADMIN],
		},
		{ path: "/admin", label: "Admin", icon: Settings, roles: [ROLES.ADMIN] },
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
						.filter((item) => user?.role && item.roles.includes(user.role))
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
			<main className="flex-1 p-4 md:p-8 overflow-y-auto">
				<div className="max-w-5xl mx-auto">{children}</div>
			</main>
		</div>
	);
}
