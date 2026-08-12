import { Loader2 } from "lucide-react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { UserManagement } from "./components/UserManagement";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ShiftProvider } from "./contexts/ShiftContext";
import { Layout } from "./layouts/Layout";
import { Admin } from "./pages/Admin";
import { AuditLogs } from "./pages/AuditLogs";
import { Credits } from "./pages/Credits";
import { Dashboard } from "./pages/Dashboard";
import { EmployeeRoster } from "./pages/EmployeeRoster";
import { Expenses } from "./pages/Expenses";
import { GameSales } from "./pages/GameSales";
import { Keno } from "./pages/Keno";
import { Login } from "./pages/Login";
import { Reports } from "./pages/Reports";
import { SalaryReport } from "./pages/SalaryReport";

function AppContent() {
	const { user, loading } = useAuth();

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
		<ShiftProvider>
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
								<Route path="/admin/employees" element={<EmployeeRoster />} />
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
		</ShiftProvider>
	);
}

export default function App() {
	return (
		<ErrorBoundary>
			<AuthProvider>
				<AppContent />
			</AuthProvider>
		</ErrorBoundary>
	);
}
