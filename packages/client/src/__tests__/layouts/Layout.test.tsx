/**
 * @vitest-environment jsdom
 */
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Layout } from "../../layouts/Layout.js";

vi.mock("../../firebase", () => ({
	auth: {
		currentUser: { getIdToken: vi.fn().mockResolvedValue("mock-token") },
	},
}));

vi.mock("firebase/auth", () => ({
	signOut: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../../contexts/AuthContext.js", () => ({
	useAuth: vi.fn(),
}));

vi.mock("react-router-dom", () => ({
	useLocation: vi.fn(),
	Link: ({
		to,
		children,
		className,
		onClick,
	}: {
		to: string;
		children: React.ReactNode;
		className?: string;
		onClick?: React.MouseEventHandler<HTMLAnchorElement>;
	}) => (
		<a href={to} className={className} onClick={onClick}>
			{children}
		</a>
	),
}));

import { signOut } from "firebase/auth";
import { useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext.js";

const mockUseAuth = vi.mocked(useAuth);
const mockUseLocation = vi.mocked(useLocation);

const adminUser = {
	uid: "u1",
	displayName: "Admin User",
	role: "admin" as const,
	email: "admin@test.com",
};

const staffUser = {
	uid: "u2",
	displayName: "Staff User",
	role: "staff" as const,
	email: "staff@test.com",
};

const managerUser = {
	uid: "u3",
	displayName: "Manager User",
	role: "manager" as const,
	email: "manager@test.com",
};

describe("Layout", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockUseLocation.mockReturnValue({
			pathname: "/",
			search: "",
			hash: "",
			state: null,
			key: "default",
		});
	});

	it("renders sidebar with user name and role", () => {
		mockUseAuth.mockReturnValue({
			user: adminUser,
			loading: false,
		});

		render(
			<Layout>
				<div>Child content</div>
			</Layout>,
		);

		expect(screen.getAllByText("Game Zone").length).toBeGreaterThanOrEqual(1);
		expect(
			screen.getAllByText("Admin User (admin)").length,
		).toBeGreaterThanOrEqual(1);
	});

	it("renders children content", () => {
		mockUseAuth.mockReturnValue({
			user: adminUser,
			loading: false,
		});

		render(
			<Layout>
				<div>Test child content</div>
			</Layout>,
		);

		expect(screen.getByText("Test child content")).toBeDefined();
	});

	it("shows all nav items for admin role", () => {
		mockUseAuth.mockReturnValue({
			user: adminUser,
			loading: false,
		});

		render(
			<Layout>
				<div>Content</div>
			</Layout>,
		);

		expect(screen.getByText("Dashboard")).toBeDefined();
		expect(screen.getByText("Game Sales")).toBeDefined();
		expect(screen.getByText("Keno")).toBeDefined();
		expect(screen.getByText("Credits (IOUs)")).toBeDefined();
		expect(screen.getByText("Expenses")).toBeDefined();
		expect(screen.getByText("Salary Report")).toBeDefined();
		expect(screen.getByText("Reports")).toBeDefined();
		expect(screen.getByText("Employee Roster")).toBeDefined();
		expect(screen.getByText("Activity Log")).toBeDefined();
		expect(screen.getByText("User Management")).toBeDefined();
		expect(screen.getByText("Admin")).toBeDefined();
	});

	it("shows only Dashboard and Game Sales for staff role", () => {
		mockUseAuth.mockReturnValue({
			user: staffUser,
			loading: false,
		});

		render(
			<Layout>
				<div>Content</div>
			</Layout>,
		);

		expect(screen.getByText("Dashboard")).toBeDefined();
		expect(screen.getByText("Game Sales")).toBeDefined();
		expect(screen.queryByText("Keno")).toBeNull();
		expect(screen.queryByText("Credits (IOUs)")).toBeNull();
		expect(screen.queryByText("Expenses")).toBeNull();
		expect(screen.queryByText("Admin")).toBeNull();
		expect(screen.queryByText("Activity Log")).toBeNull();
	});

	it("shows manager nav items for manager role", () => {
		mockUseAuth.mockReturnValue({
			user: managerUser,
			loading: false,
		});

		render(
			<Layout>
				<div>Content</div>
			</Layout>,
		);

		expect(screen.getByText("Dashboard")).toBeDefined();
		expect(screen.getByText("Game Sales")).toBeDefined();
		expect(screen.getByText("Keno")).toBeDefined();
		expect(screen.getByText("Credits (IOUs)")).toBeDefined();
		expect(screen.queryByText("Activity Log")).toBeNull();
		expect(screen.getByText("Admin")).toBeDefined();
	});

	it("calls signOut when Sign Out button is clicked", async () => {
		mockUseAuth.mockReturnValue({
			user: adminUser,
			loading: false,
		});

		render(
			<Layout>
				<div>Content</div>
			</Layout>,
		);

		fireEvent.click(screen.getByText("Sign Out"));

		await waitFor(() => {
			expect(
				screen.getByText("Are you sure you want to sign out?"),
			).toBeInTheDocument();
		});

		const confirmButtons = screen.getAllByText("Sign Out");
		const confirmBtn = confirmButtons[confirmButtons.length - 1];
		fireEvent.click(confirmBtn);

		await waitFor(() => {
			expect(signOut).toHaveBeenCalled();
		});
	});

	it("does not sign out when Cancel is clicked in the sign-out dialog", async () => {
		mockUseAuth.mockReturnValue({
			user: adminUser,
			loading: false,
		});

		render(
			<Layout>
				<div>Content</div>
			</Layout>,
		);

		fireEvent.click(screen.getByText("Sign Out"));

		await waitFor(() => {
			expect(
				screen.getByText("Are you sure you want to sign out?"),
			).toBeInTheDocument();
		});

		fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

		expect(signOut).not.toHaveBeenCalled();
		expect(
			screen.queryByText("Are you sure you want to sign out?"),
		).not.toBeInTheDocument();
	});

	it("highlights active nav item based on current path", () => {
		mockUseLocation.mockReturnValue({
			pathname: "/admin",
			search: "",
			hash: "",
			state: null,
			key: "default",
		});
		mockUseAuth.mockReturnValue({
			user: adminUser,
			loading: false,
		});

		render(
			<Layout>
				<div>Content</div>
			</Layout>,
		);

		const adminLink = screen.getByText("Admin").closest("a");
		expect(adminLink?.className).toContain("bg-zinc-800");
		expect(adminLink?.className).toContain("text-white");
	});

	it("renders mobile header with hamburger toggle button", () => {
		mockUseAuth.mockReturnValue({
			user: adminUser,
			loading: false,
		});

		render(
			<Layout>
				<div>Mobile content</div>
			</Layout>,
		);

		const toggleBtn = screen.getByRole("button", {
			name: "Toggle navigation menu",
		});
		expect(toggleBtn).toBeInTheDocument();
	});

	it("opens mobile drawer when hamburger toggle is clicked and closes on link click", async () => {
		mockUseAuth.mockReturnValue({
			user: adminUser,
			loading: false,
		});

		render(
			<Layout>
				<div>Mobile content</div>
			</Layout>,
		);

		const toggleBtn = screen.getByRole("button", {
			name: "Toggle navigation menu",
		});
		expect(screen.queryByTestId("mobile-nav-drawer")).toBeNull();

		fireEvent.click(toggleBtn);
		const drawer = screen.getByTestId("mobile-nav-drawer");
		expect(drawer).toBeInTheDocument();

		// Clicking a nav link inside drawer closes drawer
		const mobileDashboardLink = drawer.querySelector(
			'a[href="/"]',
		) as HTMLElement;
		fireEvent.click(mobileDashboardLink);
		expect(screen.queryByTestId("mobile-nav-drawer")).toBeNull();
	});

	it("renders mobile drawer items with explicit high-contrast text and touch target classes", () => {
		mockUseAuth.mockReturnValue({
			user: adminUser,
			loading: false,
		});

		render(
			<Layout>
				<div>Mobile content</div>
			</Layout>,
		);

		const toggleBtn = screen.getByRole("button", {
			name: "Toggle navigation menu",
		});
		fireEvent.click(toggleBtn);
		const drawer = screen.getByTestId("mobile-nav-drawer");
		expect(drawer.className).toContain("text-zinc-100");

		// Inactive link in drawer has explicit text-zinc-200 and py-3 classes
		const inactiveLink = drawer.querySelector('a[href="/games"]');
		expect(inactiveLink).not.toBeNull();
		expect(inactiveLink?.className).toContain("text-zinc-200");
		expect(inactiveLink?.className).toContain("py-3");

		// Sign out button in drawer has explicit text-zinc-200 class
		const signOutBtn = drawer.querySelector("button");
		expect(signOutBtn?.className).toContain("text-zinc-200");
	});
});
