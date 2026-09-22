import { ROLES, type Role } from "@level-up/shared";
import { signOut } from "firebase/auth";
import {
	BarChart,
	ClipboardList,
	Coins,
	CreditCard,
	Gamepad2,
	LayoutDashboard,
	LogOut,
	Menu,
	Receipt,
	Settings,
	UserCog,
	Users,
	X,
} from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "../components/ui/button";
import { ConfirmDialog } from "../components/ui/confirm-dialog";
import { useAuth } from "../contexts/AuthContext";
import { auth } from "../firebase";

export function Layout({ children }: { children: React.ReactNode }) {
	const { user } = useAuth();
	const location = useLocation();
	const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

	// Auto-close mobile drawer on route navigation
	useEffect(() => {
		if (location.pathname) {
			setIsMobileMenuOpen(false);
		}
	}, [location.pathname]);

	const navItems: {
		path: string;
		label: string;
		icon: typeof Settings;
		roles: Role[];
	}[] = [
		{
			path: "/",
			label: "Dashboard",
			icon: LayoutDashboard,
			roles: [ROLES.ADMIN, ROLES.MANAGER],
		},
		{
			path: "/games",
			label: "Game Sales",
			icon: Gamepad2,
			roles: [ROLES.ADMIN, ROLES.MANAGER],
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
		{
			path: "/admin",
			label: "Admin",
			icon: Settings,
			roles: [ROLES.ADMIN, ROLES.MANAGER],
		},
	];

	const visibleNavItems = navItems.filter(
		(item) => user?.role && item.roles.includes(user.role),
	);

	return (
		<div className="min-h-screen bg-zinc-50 flex flex-col md:flex-row">
			{/* Desktop Permanent Sidebar */}
			<aside className="hidden md:flex md:w-64 bg-zinc-900 text-zinc-300 flex-col">
				<div className="p-4 md:p-6 border-b border-zinc-800">
					<h1 className="text-xl font-bold text-white">Game Zone</h1>
					<p className="text-xs text-zinc-500 mt-1">
						{user?.displayName} ({user?.role})
					</p>
				</div>
				<nav className="flex-1 p-4 space-y-1 overflow-y-auto">
					{visibleNavItems.map((item) => {
						const Icon = item.icon;
						const isActive = location.pathname === item.path;
						return (
							<Link
								key={item.path}
								to={item.path}
								className={`flex items-center space-x-3 px-3 py-2 rounded-md transition-colors ${
									isActive
										? "bg-zinc-800 text-white"
										: "text-zinc-300 hover:bg-zinc-800 hover:text-white"
								}`}
							>
								<Icon
									size={18}
									className={isActive ? "text-indigo-400" : "text-zinc-400"}
								/>
								<span className="text-sm font-medium">{item.label}</span>
							</Link>
						);
					})}
				</nav>
				<div className="p-4 border-t border-zinc-800">
					<Button
						variant="ghost"
						className="w-full justify-start text-zinc-400 hover:text-white hover:bg-zinc-800"
						onClick={() => setShowSignOutConfirm(true)}
					>
						<LogOut size={18} className="mr-3" />
						Sign Out
					</Button>
				</div>
			</aside>

			{/* Mobile Header Bar */}
			<header className="order-first md:order-none md:hidden flex items-center justify-between px-4 py-3 bg-zinc-900 text-zinc-300 border-b border-zinc-800 sticky top-0 z-30">
				<div>
					<h1 className="text-lg font-bold text-white leading-tight">
						Game Zone
					</h1>
					<p className="text-xs text-zinc-500">
						{user?.displayName} ({user?.role})
					</p>
				</div>
				<Button
					variant="ghost"
					size="icon"
					className="text-zinc-300 hover:text-white hover:bg-zinc-800"
					aria-label="Toggle navigation menu"
					onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
				>
					{isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
				</Button>
			</header>

			{/* Mobile Navigation Drawer */}
			{isMobileMenuOpen && (
				<div
					data-testid="mobile-nav-drawer"
					className="order-first md:order-none md:hidden fixed inset-0 top-[57px] z-40 bg-zinc-900/95 text-zinc-100 backdrop-blur-sm flex flex-col border-b border-zinc-800"
				>
					<nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
						{visibleNavItems.map((item) => {
							const Icon = item.icon;
							const isActive = location.pathname === item.path;
							return (
								<Link
									key={item.path}
									to={item.path}
									onClick={() => setIsMobileMenuOpen(false)}
									className={`flex items-center space-x-3.5 px-3.5 py-3 rounded-lg transition-colors ${
										isActive
											? "bg-zinc-800 text-white font-semibold shadow-sm ring-1 ring-zinc-700/60"
											: "text-zinc-200 hover:bg-zinc-800/80 hover:text-white"
									}`}
								>
									<Icon
										size={20}
										className={isActive ? "text-indigo-400" : "text-zinc-400"}
									/>
									<span className="text-sm font-medium">{item.label}</span>
								</Link>
							);
						})}
					</nav>
					<div className="p-4 border-t border-zinc-800">
						<Button
							variant="ghost"
							className="w-full justify-start text-zinc-200 hover:text-white hover:bg-zinc-800 py-3"
							onClick={() => {
								setIsMobileMenuOpen(false);
								setShowSignOutConfirm(true);
							}}
						>
							<LogOut size={18} className="mr-3 text-zinc-400" />
							Sign Out
						</Button>
					</div>
				</div>
			)}

			<ConfirmDialog
				open={showSignOutConfirm}
				title="Sign Out"
				message="Are you sure you want to sign out?"
				confirmLabel="Sign Out"
				confirmVariant="destructive"
				onConfirm={() => {
					setShowSignOutConfirm(false);
					signOut(auth);
				}}
				onCancel={() => setShowSignOutConfirm(false)}
			/>

			{/* Main Content */}
			<main className="flex-1 p-4 md:p-8 overflow-y-auto">
				<div className="max-w-5xl mx-auto">{children}</div>
			</main>
		</div>
	);
}
