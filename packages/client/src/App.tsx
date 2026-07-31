import { endOfDay, format, startOfDay } from "date-fns";
import { formatInTimeZone, toZonedTime } from "date-fns-tz";
import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import {
	collection,
	doc,
	getDoc,
	onSnapshot,
	orderBy,
	query,
	where,
} from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
	BrowserRouter,
	Link,
	Navigate,
	Route,
	Routes,
	useLocation,
} from "react-router-dom";
import { auth, db, googleProvider } from "./firebase";

const SHOP_TIMEZONE = "Africa/Addis_Ababa";

const getShopDate = (date: Date = new Date()) => {
	return toZonedTime(date, SHOP_TIMEZONE);
};

const getShopStartOfDay = (date: Date = new Date()) => {
	return startOfDay(getShopDate(date));
};

const getShopEndOfDay = (date: Date = new Date()) => {
	return endOfDay(getShopDate(date));
};

// --- Types ---
import type {
	AppUser,
	Credit,
	Expense,
	GameRate,
	GameSalesLog,
	KenoLog,
	Shift,
} from "@level-up/shared";
import {
	BarChart,
	ClipboardList,
	Coins,
	CreditCard,
	Edit2,
	Gamepad2,
	LayoutDashboard,
	Loader2,
	LogOut,
	Receipt,
	Settings,
	Trash2,
	UserCog,
	Users,
} from "lucide-react";
import { Toaster, toast } from "sonner";
import { UserManagement } from "./components/UserManagement";
import { Button } from "./components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "./components/ui/card";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";

// --- Error Handler ---
enum OperationType {
	CREATE = "create",
	UPDATE = "update",
	DELETE = "delete",
	LIST = "list",
	GET = "get",
	WRITE = "write",
}

function handleFirestoreError(
	error: unknown,
	operationType: OperationType,
	path: string | null,
) {
	const errInfo = {
		error: error instanceof Error ? error.message : String(error),
		authInfo: {
			userId: auth.currentUser?.uid,
			email: auth.currentUser?.email,
			emailVerified: auth.currentUser?.emailVerified,
			isAnonymous: auth.currentUser?.isAnonymous,
			tenantId: auth.currentUser?.tenantId,
			providerInfo:
				auth.currentUser?.providerData.map((provider) => ({
					providerId: provider.providerId,
					displayName: provider.displayName,
					email: provider.email,
					photoUrl: provider.photoURL,
				})) || [],
		},
		operationType,
		path,
	};
	console.error("Firestore Error: ", JSON.stringify(errInfo));
	toast.error(`Error: ${errInfo.error}`);
}

// --- Context ---
interface AuthContextType {
	user: AppUser | null;
	loading: boolean;
}
const AuthContext = React.createContext<AuthContextType>({
	user: null,
	loading: true,
});

interface ShiftContextType {
	activeShift: Shift | null;
	loadingShift: boolean;
}
const ShiftContext = React.createContext<ShiftContextType>({
	activeShift: null,
	loadingShift: true,
});

// --- Components ---

function Login() {
	const [error, setError] = useState("");

	const handleLogin = async () => {
		try {
			await signInWithPopup(auth, googleProvider);
			// biome-ignore lint/suspicious/noExplicitAny: API error response
		} catch (err: any) {
			setError(err.message);
		}
	};

	return (
		<div className="min-h-screen flex items-center justify-center bg-zinc-50 p-4">
			<Card className="w-full max-w-md">
				<CardHeader className="text-center">
					<CardTitle className="text-2xl font-bold">
						Game Zone Manager
					</CardTitle>
					<CardDescription>Sign in to access the dashboard</CardDescription>
				</CardHeader>
				<CardContent>
					{error && (
						<div className="bg-red-50 text-red-600 p-3 rounded-md mb-4 text-sm">
							{error}
						</div>
					)}
					<Button className="w-full" onClick={handleLogin}>
						Sign in with Google
					</Button>
				</CardContent>
			</Card>
		</div>
	);
}

function Layout({ children }: { children: React.ReactNode }) {
	const { user } = React.useContext(AuthContext);
	const { activeShift, loadingShift } = React.useContext(ShiftContext);
	const location = useLocation();
	const [openingFloat, setOpeningFloat] = useState("");

	const handleStartShift = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!openingFloat || !user) return;
		try {
			const token = await auth.currentUser?.getIdToken();
			if (!token) throw new Error("Not authenticated");

			const response = await fetch("http://localhost:4000/api/shifts", {
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
					(await response.json()).error || "Failed to start shift",
				);

			setOpeningFloat("");
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

// --- Pages ---

function Dashboard() {
	// React.useContext(AuthContext);
	const { activeShift, loadingShift } = React.useContext(ShiftContext);

	const [closingCash, setClosingCash] = useState("");
	const [shortageReason, setShortageReason] = useState("");
	const [isClosing, setIsClosing] = useState(false);

	const [gameSales, setGameSales] = useState<GameSalesLog[]>([]);
	const [kenoLogs, setKenoLogs] = useState<KenoLog[]>([]);
	const [credits, setCredits] = useState<Credit[]>([]);
	const [expenses, setExpenses] = useState<Expense[]>([]);

	useEffect(() => {
		const start = activeShift
			? activeShift.start_time
			: getShopStartOfDay().toISOString();

		const qGames = query(
			collection(db, "game_sales_logs"),
			where("date", ">=", start),
		);
		const unsubGames = onSnapshot(qGames, (snap) =>
			setGameSales(
				snap.docs.map((d) => ({ id: d.id, ...d.data() }) as GameSalesLog),
			),
		);

		const qKeno = query(
			collection(db, "keno_logs"),
			where("date", ">=", start),
		);
		const unsubKeno = onSnapshot(qKeno, (snap) =>
			setKenoLogs(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as KenoLog)),
		);

		const qCredits = query(
			collection(db, "credits"),
			where("date", ">=", start),
		);
		const unsubCredits = onSnapshot(qCredits, (snap) =>
			setCredits(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Credit)),
		);

		const qExpenses = query(
			collection(db, "expenses"),
			where("date", ">=", start),
		);
		const unsubExpenses = onSnapshot(qExpenses, (snap) =>
			setExpenses(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Expense)),
		);

		return () => {
			unsubGames();
			unsubKeno();
			unsubCredits();
			unsubExpenses();
		};
	}, [activeShift]);

	const totalGameSales = gameSales.reduce(
		(sum, log) => sum + log.calculated_total,
		0,
	);
	const totalKenoNet = kenoLogs.reduce((sum, log) => sum + log.net_profit, 0);
	const pendingCredits = credits
		.filter((c) => c.status === "Pending")
		.reduce((sum, log) => sum + log.amount, 0);
	const totalExpenses = expenses.reduce((sum, log) => sum + log.amount, 0);

	const expectedCash =
		(activeShift?.opening_float || 0) +
		totalKenoNet +
		totalGameSales -
		totalExpenses -
		pendingCredits;
	const variance = closingCash ? parseFloat(closingCash) - expectedCash : 0;

	const handleCloseShift = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!activeShift || !closingCash) return;
		if (Math.abs(variance) > 2 && !shortageReason) {
			toast.error("Variance is greater than $2.00. Please provide a reason.");
			return;
		}
		try {
			const token = await auth.currentUser?.getIdToken();
			if (!token) throw new Error("Not authenticated");

			const response = await fetch(
				`http://localhost:4000/api/shifts/${activeShift.id}/close`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${token}`,
					},
					body: JSON.stringify({
						actualCashCounted: parseFloat(closingCash),
						shortageReason: shortageReason,
					}),
				},
			);

			const data = await response.json();
			if (!response.ok) throw new Error(data.error || "Failed to close shift");

			setClosingCash("");
			setShortageReason("");
			setIsClosing(false);
			toast.success("Shift closed successfully!");
			// biome-ignore lint/suspicious/noExplicitAny: API error response
		} catch (err: any) {
			console.error(err);
			toast.error(err.message || "Error closing shift");
		}
	};

	if (loadingShift)
		return (
			<div className="p-8 text-center">
				<Loader2 className="animate-spin mx-auto" />
			</div>
		);

	return (
		<div className="space-y-6">
			{/* Safe Slip Print View (Hidden on screen) */}
			<div className="hidden print:block absolute top-0 left-0 w-full bg-white text-black p-8">
				<h1 className="text-2xl font-bold mb-4">Safe Slip (Z-Report)</h1>
				<div className="mb-4">
					<p>
						<strong>Date:</strong> {format(new Date(), "MMMM d, yyyy")}
					</p>
					<p>
						<strong>Manager:</strong> {activeShift?.manager_name}
					</p>
					<p>
						<strong>Shift Start:</strong>{" "}
						{activeShift
							? format(new Date(activeShift.start_time), "h:mm a")
							: ""}
					</p>
				</div>
				<h2 className="text-xl font-bold mt-6 border-b pb-2">Revenue</h2>
				<p>Keno Net: ${totalKenoNet.toFixed(2)}</p>
				<p>Games Total: ${totalGameSales.toFixed(2)}</p>
				<h2 className="text-xl font-bold mt-6 border-b pb-2">Cash Movements</h2>
				<p>Expenses: ${totalExpenses.toFixed(2)}</p>
				<p>Pending Credits: ${pendingCredits.toFixed(2)}</p>
				<h2 className="text-xl font-bold mt-6 border-b pb-2">Bottom Line</h2>
				<p>Opening Float: ${(activeShift?.opening_float || 0).toFixed(2)}</p>
				<p>Expected Cash: ${expectedCash.toFixed(2)}</p>
				<p>Actual Cash: ${closingCash || "_____"}</p>
				<p>Variance: ${variance.toFixed(2)}</p>
				{shortageReason && <p>Reason: {shortageReason}</p>}
				<div className="mt-16 flex justify-between">
					<div className="border-t border-black w-48 text-center pt-2">
						Manager Signature
					</div>
					<div className="border-t border-black w-48 text-center pt-2">
						Owner Signature
					</div>
				</div>
			</div>

			<div className="print:hidden space-y-6">
				<h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>

				<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
					<Card>
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="text-sm font-medium">Game Sales</CardTitle>
							<Gamepad2 className="h-4 w-4 text-zinc-500" />
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold">
								${totalGameSales.toFixed(2)}
							</div>
						</CardContent>
					</Card>
					<Card>
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="text-sm font-medium">Keno Net</CardTitle>
							<Coins className="h-4 w-4 text-zinc-500" />
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold">
								${totalKenoNet.toFixed(2)}
							</div>
						</CardContent>
					</Card>
					<Card>
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="text-sm font-medium">
								Pending Credits
							</CardTitle>
							<CreditCard className="h-4 w-4 text-zinc-500" />
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold text-red-500">
								-${pendingCredits.toFixed(2)}
							</div>
						</CardContent>
					</Card>
					<Card>
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="text-sm font-medium">Expenses</CardTitle>
							<Receipt className="h-4 w-4 text-zinc-500" />
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold text-red-500">
								-${totalExpenses.toFixed(2)}
							</div>
						</CardContent>
					</Card>
				</div>

				<h2 className="text-xl font-bold tracking-tight mt-8">
					Shift Management
				</h2>

				{activeShift && (
					<Card className="bg-zinc-900 text-white border-zinc-800">
						<CardHeader>
							<CardTitle>Active Shift: {activeShift.manager_name}</CardTitle>
							<CardDescription className="text-zinc-400">
								Started at {format(new Date(activeShift.start_time), "h:mm a")}
							</CardDescription>
						</CardHeader>
						<CardContent>
							{!isClosing ? (
								<Button
									onClick={() => setIsClosing(true)}
									className="w-full bg-white text-black hover:bg-zinc-200"
								>
									Close Shift (Blind Count)
								</Button>
							) : (
								<form
									onSubmit={handleCloseShift}
									className="space-y-4 mt-4 bg-zinc-800 p-4 rounded-md"
								>
									<div className="space-y-2">
										<Label htmlFor="closingCash" className="text-white">
											Actual Cash Counted ($)
										</Label>
										<Input
											id="closingCash"
											type="number"
											step="0.01"
											min="0"
											value={closingCash}
											onChange={(e) => setClosingCash(e.target.value)}
											className="bg-zinc-900 border-zinc-700 text-white"
											required
										/>
									</div>
									{closingCash && (
										<div className="p-4 bg-zinc-900 rounded-md border border-zinc-700">
											<div className="text-sm text-zinc-400 mb-1">
												Expected Cash: ${expectedCash.toFixed(2)}
											</div>
											<div className="text-sm text-zinc-400 mb-1">Variance</div>
											<div
												className={`text-2xl font-bold ${variance < 0 ? "text-red-400" : variance > 0 ? "text-emerald-400" : "text-white"}`}
											>
												${variance.toFixed(2)}
											</div>
										</div>
									)}
									{Math.abs(variance) > 2 && (
										<div className="space-y-2">
											<Label htmlFor="reason" className="text-red-400">
												Reason for Variance (Required)
											</Label>
											<Input
												id="reason"
												type="text"
												value={shortageReason}
												onChange={(e) => setShortageReason(e.target.value)}
												className="bg-zinc-900 border-red-900 text-white"
												required
											/>
										</div>
									)}
									<div className="flex gap-2">
										<Button
											type="submit"
											className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
											disabled={
												!closingCash ||
												(Math.abs(variance) > 2 && !shortageReason)
											}
										>
											Confirm & Close Shift
										</Button>
										<Button
											type="button"
											variant="outline"
											className="text-zinc-300 border-zinc-700 hover:bg-zinc-800"
											onClick={() => setIsClosing(false)}
										>
											Cancel
										</Button>
										{closingCash && (
											<Button
												type="button"
												variant="secondary"
												onClick={() => window.print()}
											>
												Print Safe Slip
											</Button>
										)}
									</div>
								</form>
							)}
						</CardContent>
					</Card>
				)}
			</div>
		</div>
	);
}

function GameSales() {
	const { user } = React.useContext(AuthContext);
	// React.useContext(ShiftContext);
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
		const qRates = query(
			collection(db, "game_rates"),
			where("isActive", "==", true),
		);
		const unsubRates = onSnapshot(
			qRates,
			(snap) => {
				setRates(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as GameRate));
				setLoadingRates(false);
			},
			(err) => {
				handleFirestoreError(err, OperationType.LIST, "game_rates");
				setLoadingRates(false);
			},
		);

		const start = getShopStartOfDay().toISOString();
		const end = getShopEndOfDay().toISOString();
		const qLogs = query(
			collection(db, "game_sales_logs"),
			where("date", ">=", start),
			where("date", "<=", end),
		);
		const unsubLogs = onSnapshot(
			qLogs,
			(snap) => {
				const fetchedLogs = snap.docs.map(
					(d) => ({ id: d.id, ...d.data() }) as GameSalesLog,
				);
				// Sort client-side to avoid needing a composite index for this simple view
				fetchedLogs.sort(
					(a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
				);
				setLogs(fetchedLogs);
			},
			(err) => handleFirestoreError(err, OperationType.LIST, "game_sales_logs"),
		);

		return () => {
			unsubRates();
			unsubLogs();
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

			const response = await fetch(`http://localhost:4000/api/sales/${id}`, {
				method: "DELETE",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({ deleteReason }),
			});
			if (!response.ok)
				throw new Error((await response.json()).error || "Failed to delete");

			toast.success("Log deleted successfully!");
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
				const response = await fetch(
					`http://localhost:4000/api/sales/${editingId}`,
					{
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
					},
				);
				if (!response.ok)
					throw new Error((await response.json()).error || "Failed to update");
				toast.success("Game sale updated successfully!");
				cancelEdit();
			} else {
				const response = await fetch(`http://localhost:4000/api/sales`, {
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
						(await response.json()).error || "Failed to log sale",
					);
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

								await fetch("http://localhost:4000/api/rates", {
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
								await fetch("http://localhost:4000/api/rates", {
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

function Keno() {
	const { user } = React.useContext(AuthContext);
	// React.useContext(ShiftContext); // Removed unused vars
	const [sales, setSales] = useState("");
	const [payouts, setPayouts] = useState("");
	const [loading, setLoading] = useState(false);
	const [logs, setLogs] = useState<KenoLog[]>([]);
	const [editingId, setEditingId] = useState<string | null>(null);
	const [deletingId, setDeletingId] = useState<string | null>(null);
	const [editReason, setEditReason] = useState("");
	const [deleteReason, setDeleteReason] = useState("");

	useEffect(() => {
		const start = getShopStartOfDay().toISOString();
		const end = getShopEndOfDay().toISOString();
		const qLogs = query(
			collection(db, "keno_logs"),
			where("date", ">=", start),
			where("date", "<=", end),
		);
		const unsubLogs = onSnapshot(
			qLogs,
			(snap) => {
				const fetchedLogs = snap.docs.map(
					(d) => ({ id: d.id, ...d.data() }) as KenoLog,
				);
				fetchedLogs.sort(
					(a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
				);
				setLogs(fetchedLogs);
			},
			(err) => handleFirestoreError(err, OperationType.LIST, "keno_logs"),
		);

		return () => unsubLogs();
	}, []);

	const netProfit = parseFloat(sales || "0") - parseFloat(payouts || "0");

	const handleEdit = (log: KenoLog) => {
		setEditingId(log.id);
		setSales(log.sales.toString());
		setPayouts(log.payouts.toString());
		window.scrollTo({ top: 0, behavior: "smooth" });
	};

	const cancelEdit = () => {
		setEditingId(null);
		setSales("");
		setPayouts("");
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

			const response = await fetch(`http://localhost:4000/api/keno/${id}`, {
				method: "DELETE",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({ deleteReason }),
			});
			if (!response.ok)
				throw new Error((await response.json()).error || "Failed to delete");

			toast.success("Keno log deleted successfully!");
			setDeletingId(null);
			setDeleteReason("");
		} catch (err: unknown) {
			console.error(err);
			toast.error("Failed to delete keno log");
		}
	};

	const handleVerify = async (id: string) => {
		try {
			const token = await auth.currentUser?.getIdToken();
			if (!token) throw new Error("Not authenticated");

			const response = await fetch(
				`http://localhost:4000/api/keno/${id}/verify`,
				{
					method: "PUT",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${token}`,
					},
				},
			);
			if (!response.ok)
				throw new Error((await response.json()).error || "Failed to verify");

			toast.success("Log verified!");
		} catch (err: unknown) {
			console.error(err);
			toast.error("Failed to verify keno log");
		}
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!sales || !payouts || !user) return;

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
				const response = await fetch(
					`http://localhost:4000/api/keno/${editingId}`,
					{
						method: "PUT",
						headers: {
							"Content-Type": "application/json",
							Authorization: `Bearer ${token}`,
						},
						body: JSON.stringify({
							sales: sales,
							payouts: payouts,
							net_profit: netProfit,
							editReason,
						}),
					},
				);
				if (!response.ok)
					throw new Error((await response.json()).error || "Failed to update");
				toast.success("Keno log updated successfully!");
				cancelEdit();
			} else {
				const response = await fetch(`http://localhost:4000/api/keno`, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${token}`,
					},
					body: JSON.stringify({
						sales: sales,
						payouts: payouts,
						net_profit: netProfit,
					}),
				});
				if (!response.ok)
					throw new Error(
						(await response.json()).error || "Failed to log keno",
					);
				setSales("");
				setPayouts("");
				toast.success("Keno logged successfully!");
			}
		} catch (err: unknown) {
			console.error(err);
			toast.error("Failed to save keno log");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="space-y-6">
			<h2 className="text-2xl font-bold tracking-tight">Log Keno</h2>
			<Card className="max-w-md">
				<form onSubmit={handleSubmit}>
					<CardHeader>
						<CardTitle>Daily Keno Entry</CardTitle>
						<CardDescription>
							Enter the total sales and payouts from the Keno software.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="sales">Total Sales ($)</Label>
							<Input
								id="sales"
								type="number"
								step="0.01"
								min="0"
								value={sales}
								onChange={(e) => setSales(e.target.value)}
								required
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="payouts">Total Payouts ($)</Label>
							<Input
								id="payouts"
								type="number"
								step="0.01"
								min="0"
								value={payouts}
								onChange={(e) => setPayouts(e.target.value)}
								required
							/>
						</div>
						<div className="p-4 bg-zinc-50 rounded-md border border-zinc-100">
							<div className="text-sm text-zinc-500 mb-1">Net Profit</div>
							<div
								className={`text-3xl font-bold ${netProfit < 0 ? "text-red-500" : "text-emerald-600"}`}
							>
								${netProfit.toFixed(2)}
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
									placeholder="e.g., Typo in sales amount"
								/>
							</div>
						)}
					</CardContent>
					<CardFooter className="flex gap-2">
						<Button
							type="submit"
							className="flex-1"
							disabled={
								loading || !sales || !payouts || (!!editingId && !editReason)
							}
						>
							{loading ? (
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
							) : null}
							{editingId ? "Update Keno" : "Log Keno"}
						</Button>
						{editingId && (
							<Button type="button" variant="outline" onClick={cancelEdit}>
								Cancel
							</Button>
						)}
					</CardFooter>
				</form>
			</Card>

			<Card className="max-w-2xl">
				<CardHeader>
					<CardTitle>Today's Keno Logs</CardTitle>
					<CardDescription>Recent Keno entries logged today.</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="space-y-3">
						{logs.length === 0 ? (
							<div className="text-center text-zinc-500 py-8">
								No Keno logged today yet.
							</div>
						) : (
							logs.map((log) => (
								<div
									key={log.id}
									className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 border rounded-md bg-white gap-3"
								>
									<div>
										<div className="text-sm text-zinc-500">
											Sales: ${log.sales.toFixed(2)} | Payouts: $
											{log.payouts.toFixed(2)}
										</div>
										<div
											className={`font-semibold ${log.net_profit < 0 ? "text-red-500" : "text-emerald-600"}`}
										>
											Net: ${log.net_profit.toFixed(2)}
										</div>
										<div className="text-xs text-zinc-400 mt-1 flex items-center gap-2">
											{format(new Date(log.date), "h:mm a")}
											{log.verified ? (
												<span className="text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-sm">
													Verified
												</span>
											) : (
												<span className="text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-sm">
													Unverified
												</span>
											)}
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
												{!log.verified &&
													(user?.role === "manager" ||
														user?.role === "admin") && (
														<Button
															size="sm"
															variant="outline"
															className="text-emerald-600 border-emerald-200 hover:bg-emerald-50"
															onClick={() => handleVerify(log.id)}
														>
															Verify
														</Button>
													)}
												{(user?.role === "manager" ||
													user?.role === "admin") && (
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
	);
}

function Credits() {
	const { user } = React.useContext(AuthContext);
	// React.useContext(ShiftContext); // Removed unused vars
	const [employeeName, setEmployeeName] = useState("");
	const [amount, setAmount] = useState("");
	const [loading, setLoading] = useState(false);
	const [credits, setCredits] = useState<Credit[]>([]);
	const [editingId, setEditingId] = useState<string | null>(null);
	const [deletingId, setDeletingId] = useState<string | null>(null);
	const [editReason, setEditReason] = useState("");
	const [deleteReason, setDeleteReason] = useState("");

	useEffect(() => {
		const q = query(collection(db, "credits"), orderBy("date", "desc"));
		const unsub = onSnapshot(
			q,
			(snap) => {
				setCredits(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Credit));
			},
			(err) => handleFirestoreError(err, OperationType.LIST, "credits"),
		);
		return () => unsub();
	}, []);

	const handleResolve = async (
		id: string,
		resolution: "Resolved" | "Deducted",
	) => {
		try {
			const token = await auth.currentUser?.getIdToken();
			if (!token) throw new Error("Not authenticated");

			const response = await fetch(`http://localhost:4000/api/credits/${id}`, {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({
					status: resolution,
					editReason: `Status updated to ${resolution}`,
				}),
			});
			if (!response.ok)
				throw new Error(
					(await response.json()).error || "Failed to update status",
				);

			toast.success(`Credit marked as ${resolution}`);
		} catch (err: unknown) {
			console.error(err);
			toast.error(`Failed to mark credit as ${resolution}`);
		}
	};

	const handleEdit = (credit: Credit) => {
		setEditingId(credit.id);
		setEmployeeName(credit.employee_name);
		setAmount(credit.amount.toString());
		window.scrollTo({ top: 0, behavior: "smooth" });
	};

	const cancelEdit = () => {
		setEditingId(null);
		setEmployeeName("");
		setAmount("");
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

			const response = await fetch(`http://localhost:4000/api/credits/${id}`, {
				method: "DELETE",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({ deleteReason }),
			});
			if (!response.ok)
				throw new Error((await response.json()).error || "Failed to delete");

			toast.success("Credit deleted successfully!");
			setDeletingId(null);
			setDeleteReason("");
		} catch (err: unknown) {
			console.error(err);
			toast.error("Failed to delete credit");
		}
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!employeeName || !amount || !user) return;

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
				const response = await fetch(
					`http://localhost:4000/api/credits/${editingId}`,
					{
						method: "PUT",
						headers: {
							"Content-Type": "application/json",
							Authorization: `Bearer ${token}`,
						},
						body: JSON.stringify({
							employee_name: employeeName,
							amount: amount,
							editReason,
						}),
					},
				);
				if (!response.ok)
					throw new Error((await response.json()).error || "Failed to update");
				toast.success("Credit updated successfully!");
				cancelEdit();
			} else {
				const response = await fetch("http://localhost:4000/api/credits", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${token}`,
					},
					body: JSON.stringify({
						employee_name: employeeName,
						amount: amount,
					}),
				});
				if (!response.ok)
					throw new Error(
						(await response.json()).error || "Failed to log credit",
					);
				setEmployeeName("");
				setAmount("");
				toast.success("Credit logged successfully!");
			}
		} catch (err: unknown) {
			console.error(err);
			toast.error("Failed to save credit");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="space-y-6">
			<h2 className="text-2xl font-bold tracking-tight">Log Credits (IOUs)</h2>

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				<Card className="lg:col-span-1 h-fit">
					<form onSubmit={handleSubmit}>
						<CardHeader>
							<CardTitle>New Credit</CardTitle>
							<CardDescription>
								Log an IOU for an employee. This will be deducted from the
								expected cash.
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="space-y-2">
								<Label htmlFor="employee">Employee Name</Label>
								<Input
									id="employee"
									type="text"
									value={employeeName}
									onChange={(e) => setEmployeeName(e.target.value)}
									required
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="amount">Amount ($)</Label>
								<Input
									id="amount"
									type="number"
									step="0.01"
									min="0.01"
									value={amount}
									onChange={(e) => setAmount(e.target.value)}
									required
								/>
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
										placeholder="e.g., Wrong amount entered"
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
									!employeeName ||
									!amount ||
									(!!editingId && !editReason)
								}
							>
								{loading ? (
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								) : null}
								{editingId ? "Update Credit" : "Log Credit"}
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
						<CardTitle>Recent Credits</CardTitle>
						<CardDescription>Manage employee IOUs.</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="space-y-3">
							{credits.length === 0 ? (
								<div className="text-center text-zinc-500 py-8">
									No credits logged yet.
								</div>
							) : (
								credits.map((credit) => (
									<div
										key={credit.id}
										className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 border rounded-md bg-white gap-3"
									>
										<div>
											<div className="font-medium">{credit.employee_name}</div>
											<div className="text-sm text-zinc-500">
												${credit.amount.toFixed(2)}
											</div>
											<div className="text-xs text-zinc-400 mt-1">
												{format(new Date(credit.date), "MMM d, h:mm a")}
											</div>
										</div>

										<div className="flex flex-col items-end gap-2">
											<div className="flex items-center gap-2">
												<span
													className={`text-xs font-semibold px-2 py-1 rounded-full ${
														credit.status === "Pending"
															? "bg-amber-100 text-amber-800"
															: credit.status === "Resolved"
																? "bg-emerald-100 text-emerald-800"
																: "bg-zinc-100 text-zinc-800"
													}`}
												>
													{credit.status}
												</span>
												{deletingId === credit.id ? (
													<div className="flex items-center gap-2 bg-red-50 p-1 rounded-md border border-red-100">
														<Input
															size={1}
															className="h-8 w-32 text-xs bg-white"
															placeholder="Reason..."
															value={deleteReason}
															onChange={(e) => setDeleteReason(e.target.value)}
														/>
														<Button
															size="sm"
															variant="destructive"
															onClick={() => handleDelete(credit.id)}
															disabled={!deleteReason}
														>
															Yes
														</Button>
														<Button
															size="sm"
															variant="ghost"
															onClick={() => {
																setDeletingId(null);
																setDeleteReason("");
															}}
														>
															No
														</Button>
													</div>
												) : (
													<>
														<Button
															size="icon"
															variant="ghost"
															className="h-6 w-6"
															onClick={() => handleEdit(credit)}
															disabled={!!editingId}
														>
															<Edit2 className="h-3 w-3" />
														</Button>
														<Button
															size="icon"
															variant="ghost"
															className="h-6 w-6 text-red-600 hover:text-red-700 hover:bg-red-50"
															onClick={() => setDeletingId(credit.id)}
															disabled={!!editingId}
														>
															<Trash2 className="h-3 w-3" />
														</Button>
													</>
												)}
											</div>
											{credit.status === "Pending" && (
												<div className="flex gap-2 mt-1">
													<Button
														size="sm"
														variant="outline"
														className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
														onClick={() => handleResolve(credit.id, "Resolved")}
													>
														Mark Paid
													</Button>
													<Button
														size="sm"
														variant="outline"
														className="text-zinc-600 hover:bg-zinc-50"
														onClick={() => handleResolve(credit.id, "Deducted")}
													>
														Deduct
													</Button>
												</div>
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

function Expenses() {
	const { user } = React.useContext(AuthContext);
	// React.useContext(ShiftContext); // Removed unused vars
	const [description, setDescription] = useState("");
	const [amount, setAmount] = useState("");
	const [category, setCategory] = useState("Misc");
	const [loading, setLoading] = useState(false);
	const [expenses, setExpenses] = useState<Expense[]>([]);
	const [editingId, setEditingId] = useState<string | null>(null);
	const [deletingId, setDeletingId] = useState<string | null>(null);
	const [editReason, setEditReason] = useState("");
	const [deleteReason, setDeleteReason] = useState("");

	useEffect(() => {
		const start = getShopStartOfDay().toISOString();
		const end = getShopEndOfDay().toISOString();
		const q = query(
			collection(db, "expenses"),
			where("date", ">=", start),
			where("date", "<=", end),
		);
		const unsub = onSnapshot(
			q,
			(snap) => {
				const fetched = snap.docs.map(
					(d) => ({ id: d.id, ...d.data() }) as Expense,
				);
				fetched.sort(
					(a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
				);
				setExpenses(fetched);
			},
			(err) => handleFirestoreError(err, OperationType.LIST, "expenses"),
		);
		return () => unsub();
	}, []);

	const handleEdit = (expense: Expense) => {
		setEditingId(expense.id);
		setDescription(expense.description);
		setAmount(expense.amount.toString());
		setCategory(expense.category || "Misc");
		window.scrollTo({ top: 0, behavior: "smooth" });
	};

	const cancelEdit = () => {
		setEditingId(null);
		setDescription("");
		setAmount("");
		setCategory("Misc");
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

			const response = await fetch(`http://localhost:4000/api/expenses/${id}`, {
				method: "DELETE",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({ deleteReason }),
			});
			if (!response.ok)
				throw new Error((await response.json()).error || "Failed to delete");

			toast.success("Expense deleted successfully!");
			setDeletingId(null);
			setDeleteReason("");
		} catch (err: unknown) {
			console.error(err);
			toast.error("Failed to delete expense");
		}
	};

	const handleVerify = async (id: string) => {
		try {
			const token = await auth.currentUser?.getIdToken();
			if (!token) throw new Error("Not authenticated");

			const response = await fetch(
				`http://localhost:4000/api/expenses/${id}/verify`,
				{
					method: "PUT",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${token}`,
					},
				},
			);
			if (!response.ok)
				throw new Error((await response.json()).error || "Failed to verify");

			toast.success("Expense verified!");
		} catch (err: unknown) {
			console.error(err);
			toast.error("Failed to verify expense");
		}
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!description || !amount || !user) return;

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
				const response = await fetch(
					`http://localhost:4000/api/expenses/${editingId}`,
					{
						method: "PUT",
						headers: {
							"Content-Type": "application/json",
							Authorization: `Bearer ${token}`,
						},
						body: JSON.stringify({
							description: description,
							amount: amount,
							category: category,
							editReason,
						}),
					},
				);
				if (!response.ok)
					throw new Error((await response.json()).error || "Failed to update");
				toast.success("Expense updated successfully!");
				cancelEdit();
			} else {
				const response = await fetch(`http://localhost:4000/api/expenses`, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${token}`,
					},
					body: JSON.stringify({
						description: description,
						amount: amount,
						category: category,
					}),
				});
				if (!response.ok)
					throw new Error(
						(await response.json()).error || "Failed to log expense",
					);
				setDescription("");
				setAmount("");
				setCategory("Misc");
				toast.success("Expense logged successfully!");
			}
		} catch (err: unknown) {
			console.error(err);
			toast.error("Failed to save expense");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="space-y-6">
			<h2 className="text-2xl font-bold tracking-tight">Log Expenses</h2>
			<Card className="max-w-md">
				<form onSubmit={handleSubmit}>
					<CardHeader>
						<CardTitle>New Expense</CardTitle>
						<CardDescription>
							Log a daily expense. This will be deducted from the expected cash.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="description">
								Description (e.g., Cleaning supplies)
							</Label>
							<Input
								id="description"
								type="text"
								value={description}
								onChange={(e) => setDescription(e.target.value)}
								required
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="category">Category</Label>
							<select
								id="category"
								value={category}
								onChange={(e) => setCategory(e.target.value)}
								className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
								required
							>
								<option value="Maintenance">Maintenance</option>
								<option value="Utilities">Utilities</option>
								<option value="Supplies">Supplies</option>
								<option value="Wages">Wages</option>
								<option value="Misc">Misc</option>
							</select>
						</div>
						<div className="space-y-2">
							<Label htmlFor="amount">Amount ($)</Label>
							<Input
								id="amount"
								type="number"
								step="0.01"
								min="0.01"
								value={amount}
								onChange={(e) => setAmount(e.target.value)}
								required
							/>
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
									placeholder="e.g., Typo in amount"
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
								!description ||
								!amount ||
								(!!editingId && !editReason)
							}
						>
							{loading ? (
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
							) : null}
							{editingId ? "Update Expense" : "Log Expense"}
						</Button>
						{editingId && (
							<Button type="button" variant="outline" onClick={cancelEdit}>
								Cancel
							</Button>
						)}
					</CardFooter>
				</form>
			</Card>

			<Card className="max-w-2xl">
				<CardHeader>
					<CardTitle>Today's Expenses</CardTitle>
					<CardDescription>Recent expenses logged today.</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="space-y-3">
						{expenses.length === 0 ? (
							<div className="text-center text-zinc-500 py-8">
								No expenses logged today yet.
							</div>
						) : (
							expenses.map((expense) => (
								<div
									key={expense.id}
									className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 border rounded-md bg-white gap-3"
								>
									<div>
										<div className="font-medium">{expense.description}</div>
										<div className="text-sm text-zinc-500">
											${expense.amount.toFixed(2)} &bull;{" "}
											{expense.category || "Misc"}
										</div>
										<div className="text-xs text-zinc-400 mt-1 flex items-center gap-2">
											{format(new Date(expense.date), "h:mm a")}
											{expense.verified ? (
												<span className="text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-sm">
													Verified
												</span>
											) : (
												<span className="text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-sm">
													Unverified
												</span>
											)}
										</div>
									</div>

									<div className="flex items-center gap-2 w-full sm:w-auto">
										{deletingId === expense.id ? (
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
														onClick={() => handleDelete(expense.id)}
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
												{!expense.verified &&
													(user?.role === "manager" ||
														user?.role === "admin") && (
														<Button
															size="sm"
															variant="outline"
															className="text-emerald-600 border-emerald-200 hover:bg-emerald-50"
															onClick={() => handleVerify(expense.id)}
														>
															Verify
														</Button>
													)}
												{(user?.role === "manager" ||
													user?.role === "admin") && (
													<>
														<Button
															size="sm"
															variant="outline"
															onClick={() => handleEdit(expense)}
															disabled={!!editingId}
														>
															<Edit2 className="h-4 w-4 mr-1" /> Edit
														</Button>
														<Button
															size="sm"
															variant="ghost"
															className="text-red-600 hover:text-red-700 hover:bg-red-50"
															onClick={() => setDeletingId(expense.id)}
															disabled={!!editingId}
														>
															<Trash2 className="h-4 w-4" />
														</Button>
													</>
												)}
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
	);
}

function AuditLogs() {
	// biome-ignore lint/suspicious/noExplicitAny: Firestore documents
	const [logs, setLogs] = useState<any[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const q = query(collection(db, "audit_logs"), orderBy("timestamp", "desc"));
		const unsub = onSnapshot(
			q,
			(snap) => {
				setLogs(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
				setLoading(false);
			},
			(err) => {
				handleFirestoreError(err, OperationType.LIST, "audit_logs");
				setLoading(false);
			},
		);
		return () => unsub();
	}, []);

	if (loading)
		return (
			<div className="p-8 text-center">
				<Loader2 className="animate-spin mx-auto" />
			</div>
		);

	return (
		<div className="space-y-6 max-w-5xl mx-auto">
			<h2 className="text-2xl font-bold tracking-tight">Activity Log</h2>
			<Card>
				<CardHeader>
					<CardTitle>Recent Activity</CardTitle>
					<CardDescription>
						Track changes and deletions across the system.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="overflow-x-auto">
						<table className="w-full text-sm text-left">
							<thead className="text-xs text-zinc-500 uppercase bg-zinc-50 border-b">
								<tr>
									<th className="px-4 py-3 font-medium">Time</th>
									<th className="px-4 py-3 font-medium">User</th>
									<th className="px-4 py-3 font-medium">Action</th>
									<th className="px-4 py-3 font-medium">Table</th>
									<th className="px-4 py-3 font-medium">Reason</th>
									<th className="px-4 py-3 font-medium">Details</th>
								</tr>
							</thead>
							<tbody className="divide-y">
								{logs.length === 0 ? (
									<tr>
										<td
											colSpan={6}
											className="px-4 py-8 text-center text-zinc-500"
										>
											No activity logs found.
										</td>
									</tr>
								) : (
									logs.map((log) => (
										<tr key={log.id} className="hover:bg-zinc-50">
											<td className="px-4 py-3 whitespace-nowrap text-zinc-500">
												{format(new Date(log.timestamp), "MMM d, yyyy h:mm a")}
											</td>
											<td className="px-4 py-3 font-medium">
												{log.user_email}
											</td>
											<td className="px-4 py-3">
												<span
													className={`px-2 py-1 rounded-full text-xs font-medium ${
														log.action === "UPDATE"
															? "bg-blue-100 text-blue-800"
															: log.action === "DELETE"
																? "bg-red-100 text-red-800"
																: "bg-zinc-100 text-zinc-800"
													}`}
												>
													{log.action}
												</span>
											</td>
											<td className="px-4 py-3 capitalize">
												{log.table_affected.replace("_", " ")}
											</td>
											<td className="px-4 py-3 text-zinc-600">{log.reason}</td>
											<td
												className="px-4 py-3 text-xs text-zinc-500 max-w-xs truncate"
												title={JSON.stringify(log.old_data)}
											>
												{log.action === "UPDATE"
													? "View changes"
													: "View deleted data"}
											</td>
										</tr>
									))
								)}
							</tbody>
						</table>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}

function Admin() {
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

			const response = await fetch("http://localhost:4000/api/rates", {
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
				`http://localhost:4000/api/rates/${rate.id}`,
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

// --- Main App Component ---

import {
	Cell,
	Pie,
	PieChart,
	Tooltip as RechartsTooltip,
	ResponsiveContainer,
} from "recharts";

function Reports() {
	const { user } = React.useContext(AuthContext);
	const [inputStartDate, setInputStartDate] = useState(
		formatInTimeZone(new Date(), SHOP_TIMEZONE, "yyyy-MM-dd"),
	);
	const [inputEndDate, setInputEndDate] = useState(
		formatInTimeZone(new Date(), SHOP_TIMEZONE, "yyyy-MM-dd"),
	);

	const [appliedStartDate, setAppliedStartDate] = useState(inputStartDate);
	const [appliedEndDate, setAppliedEndDate] = useState(inputEndDate);

	const [shifts, setShifts] = useState<Shift[]>([]);
	const [gameSales, setGameSales] = useState<GameSalesLog[]>([]);
	const [kenoLogs, setKenoLogs] = useState<KenoLog[]>([]);
	const [credits, setCredits] = useState<Credit[]>([]);
	const [expenses, setExpenses] = useState<Expense[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		if (!user) return;
		setLoading(true);

		// Parse the dates assuming they are in the shop's timezone (UTC+3 for Addis Ababa)
		const startIso = new Date(
			`${appliedStartDate}T00:00:00+03:00`,
		).toISOString();
		const endIso = new Date(
			`${appliedEndDate}T23:59:59.999+03:00`,
		).toISOString();

		const qShifts = query(
			collection(db, "shifts"),
			where("start_time", ">=", startIso),
			where("start_time", "<=", endIso),
		);
		const unsubShifts = onSnapshot(qShifts, (snap) =>
			setShifts(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Shift)),
		);

		const qGames = query(
			collection(db, "game_sales_logs"),
			where("date", ">=", startIso),
			where("date", "<=", endIso),
		);
		const unsubGames = onSnapshot(qGames, (snap) =>
			setGameSales(
				snap.docs.map((d) => ({ id: d.id, ...d.data() }) as GameSalesLog),
			),
		);

		const qKeno = query(
			collection(db, "keno_logs"),
			where("date", ">=", startIso),
			where("date", "<=", endIso),
		);
		const unsubKeno = onSnapshot(qKeno, (snap) =>
			setKenoLogs(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as KenoLog)),
		);

		const qCredits = query(
			collection(db, "credits"),
			where("date", ">=", startIso),
			where("date", "<=", endIso),
		);
		const unsubCredits = onSnapshot(qCredits, (snap) =>
			setCredits(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Credit)),
		);

		const qExpenses = query(
			collection(db, "expenses"),
			where("date", ">=", startIso),
			where("date", "<=", endIso),
		);
		const unsubExpenses = onSnapshot(qExpenses, (snap) => {
			setExpenses(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Expense));
			setLoading(false);
		});

		return () => {
			unsubShifts();
			unsubGames();
			unsubKeno();
			unsubCredits();
			unsubExpenses();
		};
	}, [appliedStartDate, appliedEndDate, user]);

	const handleApply = () => {
		setAppliedStartDate(inputStartDate);
		setAppliedEndDate(inputEndDate);
	};

	// --- Aggregations ---
	const totalGameSales = gameSales.reduce(
		(sum, log) => sum + log.calculated_total,
		0,
	);
	const totalKenoNet = kenoLogs.reduce((sum, log) => sum + log.net_profit, 0);
	const totalExpenses = expenses.reduce((sum, log) => sum + log.amount, 0);

	const closedShifts = shifts.filter((s) => s.status === "CLOSED");
	const totalVariance = closedShifts.reduce(
		(sum, s) => sum + (s.variance || 0),
		0,
	);
	const avgVariance =
		closedShifts.length > 0 ? totalVariance / closedShifts.length : 0;

	const netProfit = totalGameSales + totalKenoNet - totalExpenses;

	// Revenue Mix
	const revenueMix = [
		{ name: "Game Sales", value: totalGameSales },
		{ name: "Keno Net", value: totalKenoNet > 0 ? totalKenoNet : 0 },
	].filter((item) => item.value > 0);
	const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

	// Expense Breakdown
	const expensesByCategory = expenses.reduce(
		(acc, exp) => {
			const cat = exp.category || "Misc";
			acc[cat] = (acc[cat] || 0) + exp.amount;
			return acc;
		},
		{} as Record<string, number>,
	);
	const expenseData = Object.keys(expensesByCategory).map((key) => ({
		name: key,
		value: expensesByCategory[key],
	}));

	// Staff Accountability (Payroll Export)
	// We need to group Variances (from shifts) and Deducted Credits (from credits) by employee
	const staffData: Record<string, { variances: number; deductions: number }> =
		{};

	closedShifts.forEach((s) => {
		if (!staffData[s.manager_name])
			staffData[s.manager_name] = { variances: 0, deductions: 0 };
		staffData[s.manager_name].variances += s.variance || 0;
	});

	credits
		.filter((c) => c.status === "Deducted")
		.forEach((c) => {
			if (!staffData[c.employee_name])
				staffData[c.employee_name] = { variances: 0, deductions: 0 };
			staffData[c.employee_name].deductions += c.amount;
		});

	const staffList = Object.keys(staffData).sort();

	return (
		<div className="space-y-6">
			<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
				<div>
					<h2 className="text-2xl font-bold tracking-tight">
						Historical Reports
					</h2>
					<p className="text-zinc-500">
						Analyze revenue, expenses, and staff accountability.
					</p>
				</div>
				<div className="flex items-center gap-2">
					<Input
						type="date"
						value={inputStartDate}
						onChange={(e) => setInputStartDate(e.target.value)}
						className="w-auto"
					/>
					<span className="text-zinc-500">to</span>
					<Input
						type="date"
						value={inputEndDate}
						onChange={(e) => setInputEndDate(e.target.value)}
						className="w-auto"
					/>
					<Button onClick={handleApply}>Apply</Button>
					<Button variant="outline" onClick={() => window.print()}>
						Print
					</Button>
				</div>
			</div>

			{/* Print Header */}
			<div className="hidden print:block mb-8">
				<h1 className="text-3xl font-bold">Financial Report</h1>
				<p className="text-lg text-zinc-600">
					{format(new Date(`${appliedStartDate}T00:00:00`), "MMM d, yyyy")} -{" "}
					{format(new Date(`${appliedEndDate}T23:59:59`), "MMM d, yyyy")}
				</p>
			</div>

			{loading ? (
				<div className="flex justify-center p-12">
					<Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
				</div>
			) : (
				<>
					{/* Top Level Metrics */}
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
						<Card className="bg-zinc-900 text-white border-zinc-800">
							<CardHeader className="pb-2">
								<CardTitle className="text-sm font-medium text-zinc-400">
									Net Profit
								</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="text-3xl font-bold">
									${netProfit.toFixed(2)}
								</div>
							</CardContent>
						</Card>
						<Card>
							<CardHeader className="pb-2">
								<CardTitle className="text-sm font-medium text-zinc-500">
									Total Revenue
								</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="text-2xl font-bold">
									${(totalGameSales + totalKenoNet).toFixed(2)}
								</div>
							</CardContent>
						</Card>
						<Card>
							<CardHeader className="pb-2">
								<CardTitle className="text-sm font-medium text-zinc-500">
									Total Expenses
								</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="text-2xl font-bold text-red-600">
									-${totalExpenses.toFixed(2)}
								</div>
							</CardContent>
						</Card>
						<Card>
							<CardHeader className="pb-2">
								<CardTitle className="text-sm font-medium text-zinc-500">
									Avg Shift Variance
								</CardTitle>
							</CardHeader>
							<CardContent>
								<div
									className={`text-2xl font-bold ${avgVariance < 0 ? "text-red-600" : avgVariance > 0 ? "text-emerald-600" : ""}`}
								>
									${avgVariance.toFixed(2)}
								</div>
								<p className="text-xs text-zinc-400 mt-1">
									Across {closedShifts.length} closed shifts
								</p>
							</CardContent>
						</Card>
					</div>

					<div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:block print:space-y-6">
						{/* Revenue Mix */}
						<Card className="print:break-inside-avoid">
							<CardHeader>
								<CardTitle>Revenue Mix</CardTitle>
								<CardDescription>Breakdown of income sources.</CardDescription>
							</CardHeader>
							<CardContent className="flex flex-col items-center">
								{revenueMix.length > 0 ? (
									<div className="h-64 w-full">
										<ResponsiveContainer width="100%" height="100%">
											<PieChart>
												<Pie
													data={revenueMix}
													cx="50%"
													cy="50%"
													innerRadius={60}
													outerRadius={80}
													paddingAngle={5}
													dataKey="value"
												>
													{revenueMix.map((_entry, index) => (
														<Cell
															key={`cell-${_entry.name || index}`}
															fill={COLORS[index % COLORS.length]}
														/>
													))}
												</Pie>
												<RechartsTooltip
													formatter={(value: number) => `$${value.toFixed(2)}`}
												/>
											</PieChart>
										</ResponsiveContainer>
									</div>
								) : (
									<div className="h-64 flex items-center justify-center text-zinc-500">
										No revenue data
									</div>
								)}
								<div className="flex gap-4 mt-4 w-full justify-center">
									{revenueMix.map((entry, index) => (
										<div key={entry.name} className="flex items-center gap-2">
											<div
												className="w-3 h-3 rounded-full"
												style={{
													backgroundColor: COLORS[index % COLORS.length],
												}}
											></div>
											<span className="text-sm font-medium">
												{entry.name} (${entry.value.toFixed(2)})
											</span>
										</div>
									))}
								</div>
							</CardContent>
						</Card>

						{/* Expense Breakdown */}
						<Card className="print:break-inside-avoid">
							<CardHeader>
								<CardTitle>The "Burn" Report</CardTitle>
								<CardDescription>Expenses categorized.</CardDescription>
							</CardHeader>
							<CardContent className="flex flex-col items-center">
								{expenseData.length > 0 ? (
									<div className="h-64 w-full">
										<ResponsiveContainer width="100%" height="100%">
											<PieChart>
												<Pie
													data={expenseData}
													cx="50%"
													cy="50%"
													innerRadius={60}
													outerRadius={80}
													paddingAngle={5}
													dataKey="value"
												>
													{expenseData.map((_entry, index) => (
														<Cell
															key={`cell-${_entry.name || index}`}
															fill={COLORS[index % COLORS.length]}
														/>
													))}
												</Pie>
												<RechartsTooltip
													formatter={(value: number) => `$${value.toFixed(2)}`}
												/>
											</PieChart>
										</ResponsiveContainer>
									</div>
								) : (
									<div className="h-64 flex items-center justify-center text-zinc-500">
										No expense data
									</div>
								)}
								<div className="flex flex-wrap gap-4 mt-4 w-full justify-center">
									{expenseData.map((entry, index) => (
										<div key={entry.name} className="flex items-center gap-2">
											<div
												className="w-3 h-3 rounded-full"
												style={{
													backgroundColor: COLORS[index % COLORS.length],
												}}
											></div>
											<span className="text-sm font-medium">
												{entry.name} (${entry.value.toFixed(2)})
											</span>
										</div>
									))}
								</div>
							</CardContent>
						</Card>
					</div>

					{/* Staff Accountability Table */}
					<Card className="print:break-inside-avoid">
						<CardHeader>
							<CardTitle>Staff Accountability & Payroll Export</CardTitle>
							<CardDescription>
								Summary of shift variances and salary deductions per employee.
							</CardDescription>
						</CardHeader>
						<CardContent>
							{staffList.length === 0 ? (
								<div className="text-center text-zinc-500 py-4">
									No staff data in this period.
								</div>
							) : (
								<div className="overflow-x-auto">
									<table className="w-full text-sm text-left">
										<thead className="text-xs text-zinc-500 uppercase bg-zinc-50 border-b">
											<tr>
												<th className="px-4 py-3 font-medium">Cashier Name</th>
												<th className="px-4 py-3 font-medium text-right">
													Total Shift Variances
												</th>
												<th className="px-4 py-3 font-medium text-right">
													Unpaid Credits (Deducted)
												</th>
												<th className="px-4 py-3 font-medium text-right">
													Total Deduction
												</th>
											</tr>
										</thead>
										<tbody>
											{staffList.map((name) => {
												const data = staffData[name];
												const totalDeduction =
													(data.variances < 0 ? Math.abs(data.variances) : 0) +
													data.deductions;
												return (
													<tr key={name} className="border-b last:border-0">
														<td className="px-4 py-3 font-medium">{name}</td>
														<td
															className={`px-4 py-3 text-right ${data.variances < 0 ? "text-red-600 font-medium" : data.variances > 0 ? "text-emerald-600" : ""}`}
														>
															${data.variances.toFixed(2)}
														</td>
														<td className="px-4 py-3 text-right text-red-600 font-medium">
															${data.deductions.toFixed(2)}
														</td>
														<td className="px-4 py-3 text-right font-bold text-red-600">
															${totalDeduction.toFixed(2)}
														</td>
													</tr>
												);
											})}
										</tbody>
									</table>
								</div>
							)}
						</CardContent>
					</Card>

					{/* Detailed Logs */}
					<div className="space-y-6 print:break-before-page">
						<h3 className="text-xl font-bold tracking-tight">Detailed Logs</h3>

						{/* Game Sales Logs */}
						<Card className="print:break-inside-avoid">
							<CardHeader>
								<CardTitle>Game Sales</CardTitle>
								<CardDescription>
									Individual game sales logged in this period.
								</CardDescription>
							</CardHeader>
							<CardContent>
								{gameSales.length === 0 ? (
									<div className="text-center text-zinc-500 py-4">
										No game sales in this period.
									</div>
								) : (
									<div className="overflow-x-auto">
										<table className="w-full text-sm text-left">
											<thead className="text-xs text-zinc-500 uppercase bg-zinc-50 border-b">
												<tr>
													<th className="px-4 py-3 font-medium">Date & Time</th>
													<th className="px-4 py-3 font-medium">Game</th>
													<th className="px-4 py-3 font-medium text-right">
														Quantity (Mins)
													</th>
													<th className="px-4 py-3 font-medium text-right">
														Total
													</th>
												</tr>
											</thead>
											<tbody>
												{[...gameSales]
													.sort(
														(a, b) =>
															new Date(b.date).getTime() -
															new Date(a.date).getTime(),
													)
													.map((log) => (
														<tr key={log.id} className="border-b last:border-0">
															<td className="px-4 py-3">
																{format(
																	new Date(log.date),
																	"MMM d, yyyy h:mm a",
																)}
															</td>
															<td className="px-4 py-3 font-medium">
																{log.game_name}
															</td>
															<td className="px-4 py-3 text-right">
																{log.quantity_sold}
															</td>
															<td className="px-4 py-3 text-right font-medium">
																${log.calculated_total.toFixed(2)}
															</td>
														</tr>
													))}
											</tbody>
										</table>
									</div>
								)}
							</CardContent>
						</Card>

						{/* Keno Logs */}
						<Card className="print:break-inside-avoid">
							<CardHeader>
								<CardTitle>Keno Logs</CardTitle>
								<CardDescription>
									Keno sales and payouts logged in this period.
								</CardDescription>
							</CardHeader>
							<CardContent>
								{kenoLogs.length === 0 ? (
									<div className="text-center text-zinc-500 py-4">
										No Keno logs in this period.
									</div>
								) : (
									<div className="overflow-x-auto">
										<table className="w-full text-sm text-left">
											<thead className="text-xs text-zinc-500 uppercase bg-zinc-50 border-b">
												<tr>
													<th className="px-4 py-3 font-medium">Date & Time</th>
													<th className="px-4 py-3 font-medium text-right">
														Sales
													</th>
													<th className="px-4 py-3 font-medium text-right">
														Payouts
													</th>
													<th className="px-4 py-3 font-medium text-right">
														Net Profit
													</th>
												</tr>
											</thead>
											<tbody>
												{[...kenoLogs]
													.sort(
														(a, b) =>
															new Date(b.date).getTime() -
															new Date(a.date).getTime(),
													)
													.map((log) => (
														<tr key={log.id} className="border-b last:border-0">
															<td className="px-4 py-3">
																{format(
																	new Date(log.date),
																	"MMM d, yyyy h:mm a",
																)}
															</td>
															<td className="px-4 py-3 text-right">
																${log.sales.toFixed(2)}
															</td>
															<td className="px-4 py-3 text-right text-red-600">
																-${log.payouts.toFixed(2)}
															</td>
															<td
																className={`px-4 py-3 text-right font-medium ${log.net_profit < 0 ? "text-red-600" : "text-emerald-600"}`}
															>
																${log.net_profit.toFixed(2)}
															</td>
														</tr>
													))}
											</tbody>
										</table>
									</div>
								)}
							</CardContent>
						</Card>

						{/* Expense Logs */}
						<Card className="print:break-inside-avoid">
							<CardHeader>
								<CardTitle>Expenses</CardTitle>
								<CardDescription>
									Expenses logged in this period.
								</CardDescription>
							</CardHeader>
							<CardContent>
								{expenses.length === 0 ? (
									<div className="text-center text-zinc-500 py-4">
										No expenses in this period.
									</div>
								) : (
									<div className="overflow-x-auto">
										<table className="w-full text-sm text-left">
											<thead className="text-xs text-zinc-500 uppercase bg-zinc-50 border-b">
												<tr>
													<th className="px-4 py-3 font-medium">Date & Time</th>
													<th className="px-4 py-3 font-medium">Category</th>
													<th className="px-4 py-3 font-medium">Description</th>
													<th className="px-4 py-3 font-medium text-right">
														Amount
													</th>
												</tr>
											</thead>
											<tbody>
												{[...expenses]
													.sort(
														(a, b) =>
															new Date(b.date).getTime() -
															new Date(a.date).getTime(),
													)
													.map((log) => (
														<tr key={log.id} className="border-b last:border-0">
															<td className="px-4 py-3">
																{format(
																	new Date(log.date),
																	"MMM d, yyyy h:mm a",
																)}
															</td>
															<td className="px-4 py-3">
																<span className="px-2 py-1 bg-zinc-100 rounded-md text-xs">
																	{log.category || "Misc"}
																</span>
															</td>
															<td className="px-4 py-3">{log.description}</td>
															<td className="px-4 py-3 text-right font-medium text-red-600">
																-${log.amount.toFixed(2)}
															</td>
														</tr>
													))}
											</tbody>
										</table>
									</div>
								)}
							</CardContent>
						</Card>
					</div>
				</>
			)}
		</div>
	);
}

function SalaryReport() {
	const [credits, setCredits] = useState<Credit[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const q = query(
			collection(db, "credits"),
			where("status", "==", "Deducted"),
		);
		const unsub = onSnapshot(
			q,
			(snap) => {
				setCredits(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Credit));
				setLoading(false);
			},
			(err) => {
				handleFirestoreError(err, OperationType.LIST, "credits");
				setLoading(false);
			},
		);
		return () => unsub();
	}, []);

	const groupedByEmployee = credits.reduce(
		(acc, credit) => {
			if (!acc[credit.employee_name]) {
				acc[credit.employee_name] = [];
			}
			acc[credit.employee_name].push(credit);
			return acc;
		},
		{} as Record<string, Credit[]>,
	);

	const employees = Object.keys(groupedByEmployee).sort();

	return (
		<div className="space-y-6">
			<h2 className="text-2xl font-bold tracking-tight">
				Salary Deductions Report
			</h2>
			<p className="text-zinc-500">
				Overview of all IOUs marked for salary deduction.
			</p>

			{loading ? (
				<div className="flex justify-center p-8">
					<Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
				</div>
			) : employees.length === 0 ? (
				<Card>
					<CardContent className="p-8 text-center text-zinc-500">
						No salary deductions found.
					</CardContent>
				</Card>
			) : (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
					{employees.map((emp) => {
						const empCredits = groupedByEmployee[emp];
						const totalDeduction = empCredits.reduce(
							(sum, c) => sum + c.amount,
							0,
						);
						return (
							<Card key={emp}>
								<CardHeader className="pb-2">
									<CardTitle className="text-lg">{emp}</CardTitle>
									<CardDescription>Total Deductions</CardDescription>
								</CardHeader>
								<CardContent>
									<div className="text-3xl font-bold text-red-600 mb-4">
										${totalDeduction.toFixed(2)}
									</div>
									<div className="space-y-2">
										<div className="text-sm font-medium text-zinc-500 border-b pb-1">
											Deduction History
										</div>
										{empCredits
											.sort(
												(a, b) =>
													new Date(b.date).getTime() -
													new Date(a.date).getTime(),
											)
											.map((c) => (
												<div
													key={c.id}
													className="flex justify-between text-sm"
												>
													<span className="text-zinc-600">
														{format(new Date(c.date), "MMM d, yyyy")}
													</span>
													<span className="font-medium">
														${c.amount.toFixed(2)}
													</span>
												</div>
											))}
									</div>
								</CardContent>
							</Card>
						);
					})}
				</div>
			)}
		</div>
	);
}

export default function App() {
	const [user, setUser] = useState<AppUser | null>(null);
	const [loading, setLoading] = useState(true);
	const [activeShift, setActiveShift] = useState<Shift | null>(null);
	const [loadingShift, setLoadingShift] = useState(true);

	useEffect(() => {
		const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
			if (firebaseUser) {
				try {
					const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
					if (userDoc.exists()) {
						setUser(userDoc.data() as AppUser);
					} else {
						const role =
							firebaseUser.email === "bezueyob3@gmail.com" ? "admin" : "staff";
						const token = await firebaseUser.getIdToken();
						const response = await fetch("http://localhost:4000/api/users", {
							method: "POST",
							headers: {
								"Content-Type": "application/json",
								Authorization: `Bearer ${token}`,
							},
							body: JSON.stringify({ role }),
						});

						if (response.ok) {
							const newUser = await response.json();
							setUser(newUser as AppUser);
						} else {
							setUser(null);
							signOut(auth);
						}
					}
				} catch (error) {
					console.error("Error fetching user role:", error);
					setUser(null);
				}
			} else {
				setUser(null);
			}
			setLoading(false);
		});

		return () => unsubscribe();
	}, []);

	useEffect(() => {
		if (!user) {
			setActiveShift(null);
			setLoadingShift(false);
			return;
		}
		const q = query(
			collection(db, "shifts"),
			where("status", "==", "OPEN"),
			orderBy("start_time", "desc"),
		);
		const unsub = onSnapshot(
			q,
			(snap) => {
				if (!snap.empty) {
					setActiveShift({
						id: snap.docs[0].id,
						...snap.docs[0].data(),
					} as Shift);
				} else {
					setActiveShift(null);
				}
				setLoadingShift(false);
			},
			(err) => {
				console.error("Error fetching shift:", err);
				setLoadingShift(false);
			},
		);
		return () => unsub();
	}, [user]);

	if (loading) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-zinc-50">
				<Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
			</div>
		);
	}

	if (!user) {
		return <Login />;
	}

	return (
		<AuthContext.Provider value={{ user, loading }}>
			<ShiftContext.Provider value={{ activeShift, loadingShift }}>
				<BrowserRouter>
					<Layout>
						<Toaster position="top-center" richColors />
						<Routes>
							<Route path="/" element={<Dashboard />} />
							<Route path="/games" element={<GameSales />} />

							{/* Manager & Admin Routes */}
							{(user.role === "manager" || user.role === "admin") && (
								<>
									<Route path="/keno" element={<Keno />} />
									<Route path="/credits" element={<Credits />} />
									<Route path="/expenses" element={<Expenses />} />
									<Route path="/salary-report" element={<SalaryReport />} />
									<Route path="/reports" element={<Reports />} />
								</>
							)}

							{/* Admin Only Routes */}
							{user.role === "admin" && (
								<>
									<Route path="/admin" element={<Admin />} />
									<Route path="/audit-logs" element={<AuditLogs />} />
									<Route path="/admin/users" element={<UserManagement />} />
								</>
							)}

							<Route path="*" element={<Navigate to="/" replace />} />
						</Routes>
					</Layout>
				</BrowserRouter>
			</ShiftContext.Provider>
		</AuthContext.Provider>
	);
}
