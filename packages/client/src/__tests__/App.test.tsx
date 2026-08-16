/**
 * @vitest-environment jsdom
 */
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockUseAuth = vi.fn();

vi.mock("../contexts/AuthContext", () => ({
	AuthProvider: ({ children }: { children: React.ReactNode }) => children,
	useAuth: () => mockUseAuth(),
}));

vi.mock("../contexts/ShiftContext", () => ({
	ShiftProvider: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("react-router-dom", () => ({
	BrowserRouter: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="router">{children}</div>
	),
	Routes: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="routes">{children}</div>
	),
	Route: ({ path, element }: { path: string; element?: React.ReactNode }) => (
		<div data-testid={`route-${path}`}>{element}</div>
	),
	Navigate: ({ to }: { to: string }) => (
		<div data-testid="navigate" data-to={to} />
	),
}));

vi.mock("../layouts/Layout", () => ({
	Layout: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="layout">{children}</div>
	),
}));

vi.mock("sonner", () => ({
	Toaster: () => <div data-testid="toaster" />,
}));

vi.mock("../pages/Dashboard", () => ({
	Dashboard: () => <div data-testid="page-dashboard" />,
}));
vi.mock("../pages/GameSales", () => ({
	GameSales: () => <div data-testid="page-gamesales" />,
}));
vi.mock("../pages/Keno", () => ({
	Keno: () => <div data-testid="page-keno" />,
}));
vi.mock("../pages/Credits", () => ({
	Credits: () => <div data-testid="page-credits" />,
}));
vi.mock("../pages/Expenses", () => ({
	Expenses: () => <div data-testid="page-expenses" />,
}));
vi.mock("../pages/SalaryReport", () => ({
	SalaryReport: () => <div data-testid="page-salaryreport" />,
}));
vi.mock("../pages/Reports", () => ({
	Reports: () => <div data-testid="page-reports" />,
}));
vi.mock("../pages/EmployeeRoster", () => ({
	EmployeeRoster: () => <div data-testid="page-employeeroster" />,
}));
vi.mock("../pages/Admin", () => ({
	Admin: () => <div data-testid="page-admin" />,
}));
vi.mock("../pages/AuditLogs", () => ({
	AuditLogs: () => <div data-testid="page-auditlogs" />,
}));
vi.mock("../pages/Login", () => ({
	Login: () => <div data-testid="page-login" />,
}));
vi.mock("../components/UserManagement", () => ({
	UserManagement: () => <div data-testid="page-usermanagement" />,
}));
vi.mock("../components/ErrorBoundary", () => ({
	ErrorBoundary: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="error-boundary">{children}</div>
	),
}));

import App from "../App";

describe("App", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders loading spinner when auth is loading", () => {
		mockUseAuth.mockReturnValue({ user: null, loading: true });
		const { container } = render(<App />);
		expect(container.querySelector(".animate-spin")).not.toBeNull();
	});

	it("renders Login when user is not authenticated", () => {
		mockUseAuth.mockReturnValue({ user: null, loading: false });
		render(<App />);
		expect(screen.getByTestId("page-login")).toBeDefined();
	});

	it("renders ErrorBoundary wrapper", () => {
		mockUseAuth.mockReturnValue({ user: null, loading: false });
		render(<App />);
		expect(screen.getByTestId("error-boundary")).toBeDefined();
	});

	it("renders routes for authenticated staff user", () => {
		mockUseAuth.mockReturnValue({
			user: { role: "staff", displayName: "Staff" },
			loading: false,
		});
		render(<App />);
		expect(screen.getByTestId("page-dashboard")).toBeDefined();
		expect(screen.getByTestId("page-gamesales")).toBeDefined();
	});

	it("renders manager routes for manager user", () => {
		mockUseAuth.mockReturnValue({
			user: { role: "manager", displayName: "Manager" },
			loading: false,
		});
		render(<App />);
		expect(screen.getByTestId("page-dashboard")).toBeDefined();
		expect(screen.getByTestId("page-gamesales")).toBeDefined();
		expect(screen.getByTestId("page-keno")).toBeDefined();
		expect(screen.getByTestId("page-credits")).toBeDefined();
		expect(screen.getByTestId("page-expenses")).toBeDefined();
		expect(screen.getByTestId("page-salaryreport")).toBeDefined();
		expect(screen.getByTestId("page-reports")).toBeDefined();
		expect(screen.getByTestId("page-employeeroster")).toBeDefined();
	});

	it("renders admin-only routes for admin user", () => {
		mockUseAuth.mockReturnValue({
			user: { role: "admin", displayName: "Admin" },
			loading: false,
		});
		render(<App />);
		expect(screen.getByTestId("page-admin")).toBeDefined();
		expect(screen.getByTestId("page-auditlogs")).toBeDefined();
		expect(screen.getByTestId("page-usermanagement")).toBeDefined();
	});

	it("does not render admin routes for staff user", () => {
		mockUseAuth.mockReturnValue({
			user: { role: "staff", displayName: "Staff" },
			loading: false,
		});
		render(<App />);
		expect(screen.queryByTestId("page-admin")).toBeNull();
		expect(screen.queryByTestId("page-auditlogs")).toBeNull();
		expect(screen.queryByTestId("page-usermanagement")).toBeNull();
	});

	it("renders Layout and Toaster for authenticated user", () => {
		mockUseAuth.mockReturnValue({
			user: { role: "staff", displayName: "Staff" },
			loading: false,
		});
		render(<App />);
		expect(screen.getByTestId("layout")).toBeDefined();
		expect(screen.getByTestId("toaster")).toBeDefined();
	});
});
