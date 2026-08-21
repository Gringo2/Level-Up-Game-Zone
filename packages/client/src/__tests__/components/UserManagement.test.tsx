/**
 * @vitest-environment jsdom
 */
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { UserManagement } from "../../components/UserManagement";
import { safeJson } from "../../lib/api";

vi.mock("../../firebase", () => ({
	auth: {
		currentUser: {
			getIdToken: vi.fn().mockResolvedValue("mock-token"),
		},
	},
}));

vi.mock("sonner", () => ({
	toast: {
		success: vi.fn(),
		error: vi.fn(),
	},
}));

const { mockFetch } = vi.hoisted(() => ({ mockFetch: vi.fn() }));
global.fetch = mockFetch;

vi.mock("../../lib/api", () => ({
	API_BASE: "http://localhost:3001",
	safeJson: vi.fn(),
	authFetch: (...args: unknown[]) => mockFetch(...(args as [string])),
}));

const mockUsers = [
	{ uid: "u1", email: "alice@test.com", displayName: "Alice", role: "staff" },
	{ uid: "u2", email: "bob@test.com", displayName: "Bob", role: "manager" },
];

describe("UserManagement", () => {
	beforeEach(() => {
		vi.restoreAllMocks();
		mockFetch.mockReset();
		(safeJson as ReturnType<typeof vi.fn>).mockReset();
		mockFetch.mockResolvedValue({ ok: true, status: 200 });
		(safeJson as ReturnType<typeof vi.fn>).mockResolvedValue(mockUsers);
	});

	it("shows loading spinner on mount", () => {
		const { container } = render(<UserManagement />);
		expect(container.querySelector(".animate-spin")).not.toBeNull();
	});

	it("loads and displays user list", async () => {
		render(<UserManagement />);
		await waitFor(() => {
			expect(screen.getByText("Alice")).toBeDefined();
			expect(screen.getByText("Bob")).toBeDefined();
			expect(screen.getByText("alice@test.com")).toBeDefined();
			expect(screen.getByText("bob@test.com")).toBeDefined();
		});
	});

	it("sends POST request when invite form is submitted", async () => {
		render(<UserManagement />);
		await waitFor(() => {
			expect(screen.getByText("Alice")).toBeDefined();
		});

		const inviteRoleSelect = screen.getAllByRole("combobox")[0];
		fireEvent.change(inviteRoleSelect, { target: { value: "manager" } });
		const emailInput = screen.getByPlaceholderText("Email address");
		fireEvent.change(emailInput, { target: { value: "new@test.com" } });
		fireEvent.click(screen.getByText("Invite"));

		await waitFor(() => {
			expect(mockFetch).toHaveBeenCalledWith(
				expect.stringContaining("/api/users/invite"),
				expect.objectContaining({ method: "POST" }),
			);
		});
	});

	it("shows success toast on invite", async () => {
		render(<UserManagement />);
		await waitFor(() => {
			expect(screen.getByText("Alice")).toBeDefined();
		});

		const inviteRoleSelect = screen.getAllByRole("combobox")[0];
		fireEvent.change(inviteRoleSelect, { target: { value: "staff" } });
		const emailInput = screen.getByPlaceholderText("Email address");
		fireEvent.change(emailInput, { target: { value: "new@test.com" } });
		fireEvent.click(screen.getByText("Invite"));

		await waitFor(() => {
			expect(toast.success).toHaveBeenCalled();
		});
	});

	it("disables invite button when email is empty", async () => {
		render(<UserManagement />);
		await waitFor(() => {
			expect(screen.getByText("Alice")).toBeDefined();
		});

		const inviteButton = screen.getByText("Invite");
		expect((inviteButton as HTMLButtonElement).disabled).toBe(true);
	});

	it("sends PUT request when role is changed", async () => {
		render(<UserManagement />);
		await waitFor(() => {
			expect(screen.getByText("Alice")).toBeDefined();
		});

		const tableRows = screen.getAllByRole("row");
		const dataRows = tableRows.filter((row) => row.querySelector("select"));
		const firstDataRowSelect = dataRows[0].querySelector(
			"select",
		) as HTMLSelectElement;
		fireEvent.change(firstDataRowSelect, {
			target: { value: "manager" },
		});

		await waitFor(() => {
			expect(screen.getByText("Change User Role")).toBeInTheDocument();
		});
		fireEvent.click(screen.getByText("Change Role"));

		await waitFor(() => {
			expect(mockFetch).toHaveBeenCalledWith(
				expect.stringContaining("/api/users/u1/role"),
				expect.objectContaining({ method: "PUT" }),
			);
		});
	});

	it("sends DELETE request when delete is confirmed", async () => {
		render(<UserManagement />);
		await waitFor(() => {
			expect(screen.getByText("Alice")).toBeDefined();
		});

		const deleteButtons = screen.getAllByTitle("Delete user account");
		fireEvent.click(deleteButtons[0]);

		expect(screen.getByText("Delete User")).toBeInTheDocument();
		fireEvent.change(screen.getByPlaceholderText("Reason for deletion..."), {
			target: { value: "Test reason" },
		});
		fireEvent.click(screen.getByText("Confirm Delete"));

		await waitFor(() => {
			expect(mockFetch).toHaveBeenCalledWith(
				expect.stringContaining("/api/users/u1"),
				expect.objectContaining({
					method: "DELETE",
					body: JSON.stringify({ deleteReason: "Test reason" }),
				}),
			);
		});
	});

	it("does not call API when delete is cancelled", async () => {
		render(<UserManagement />);
		await waitFor(() => {
			expect(screen.getByText("Alice")).toBeDefined();
		});

		const initialCallCount = mockFetch.mock.calls.length;
		const deleteButtons = screen.getAllByTitle("Delete user account");
		fireEvent.click(deleteButtons[0]);

		expect(screen.getByText("Delete User")).toBeInTheDocument();
		fireEvent.click(screen.getByText("Cancel"));

		await waitFor(() => {
			expect(mockFetch.mock.calls.length).toBe(initialCallCount);
		});
	});

	it("shows error toast when fetch users fails", async () => {
		mockFetch.mockRejectedValueOnce(new Error("Network error"));
		(safeJson as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
			new Error("parse error"),
		);
		render(<UserManagement />);
		await waitFor(() => {
			expect(toast.error).toHaveBeenCalled();
		});
	});

	it("shows error toast when invite fails", async () => {
		render(<UserManagement />);
		await waitFor(() => {
			expect(screen.getByText("Alice")).toBeDefined();
		});

		mockFetch.mockResolvedValueOnce({ ok: false, status: 400 });
		(safeJson as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			error: "already invited",
		});
		const inviteRoleSelect = screen.getAllByRole("combobox")[0];
		fireEvent.change(inviteRoleSelect, { target: { value: "staff" } });
		const emailInput = screen.getByPlaceholderText("Email address");
		fireEvent.change(emailInput, { target: { value: "dup@test.com" } });
		fireEvent.click(screen.getByText("Invite"));

		await waitFor(() => {
			expect(toast.error).toHaveBeenCalled();
		});
	});

	it("shows error toast when delete user returns non-OK response", async () => {
		render(<UserManagement />);
		await waitFor(() => {
			expect(screen.getByText("Alice")).toBeDefined();
		});

		mockFetch.mockResolvedValueOnce({ ok: false });
		(safeJson as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			error: "User not found",
		});
		const deleteButtons = screen.getAllByTitle("Delete user account");
		fireEvent.click(deleteButtons[0]);

		fireEvent.change(screen.getByPlaceholderText("Reason for deletion..."), {
			target: { value: "Test reason" },
		});
		fireEvent.click(screen.getByText("Confirm Delete"));

		await waitFor(() => {
			expect(toast.error).toHaveBeenCalled();
		});
	});

	it("shows error toast when delete user fetch rejects", async () => {
		render(<UserManagement />);
		await waitFor(() => {
			expect(screen.getByText("Alice")).toBeDefined();
		});

		mockFetch.mockRejectedValueOnce(new Error("Network error"));
		const deleteButtons = screen.getAllByTitle("Delete user account");
		fireEvent.click(deleteButtons[0]);

		fireEvent.change(screen.getByPlaceholderText("Reason for deletion..."), {
			target: { value: "Test reason" },
		});
		fireEvent.click(screen.getByText("Confirm Delete"));

		await waitFor(() => {
			expect(toast.error).toHaveBeenCalled();
		});
	});

	it("shows error toast when role update fails", async () => {
		render(<UserManagement />);
		await waitFor(() => {
			expect(screen.getByText("Alice")).toBeDefined();
		});

		mockFetch.mockResolvedValueOnce({ ok: false });
		(safeJson as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			error: "Permission denied",
		});
		const tableRows = screen.getAllByRole("row");
		const dataRows = tableRows.filter((row) => row.querySelector("select"));
		const firstDataRowSelect = dataRows[0].querySelector(
			"select",
		) as HTMLSelectElement;
		fireEvent.change(firstDataRowSelect, {
			target: { value: "manager" },
		});

		await waitFor(() => {
			expect(screen.getByText("Change User Role")).toBeInTheDocument();
		});
		fireEvent.click(screen.getByText("Change Role"));

		await waitFor(() => {
			expect(toast.error).toHaveBeenCalled();
		});
	});

	it("shows error toast when role update fetch rejects", async () => {
		render(<UserManagement />);
		await waitFor(() => {
			expect(screen.getByText("Alice")).toBeDefined();
		});

		mockFetch.mockRejectedValueOnce(new Error("Network down"));
		const tableRows = screen.getAllByRole("row");
		const dataRows = tableRows.filter((row) => row.querySelector("select"));
		const firstDataRowSelect = dataRows[0].querySelector(
			"select",
		) as HTMLSelectElement;
		fireEvent.change(firstDataRowSelect, {
			target: { value: "manager" },
		});

		await waitFor(() => {
			expect(screen.getByText("Change User Role")).toBeInTheDocument();
		});
		fireEvent.click(screen.getByText("Change Role"));

		await waitFor(() => {
			expect(toast.error).toHaveBeenCalled();
		});
	});

	it("sends selected role in POST when invite role dropdown is changed", async () => {
		render(<UserManagement />);
		await waitFor(() => {
			expect(screen.getByText("Alice")).toBeDefined();
		});

		const inviteRoleSelect = screen.getAllByRole("combobox")[0];
		fireEvent.change(inviteRoleSelect, { target: { value: "admin" } });
		const emailInput = screen.getByPlaceholderText("Email address");
		fireEvent.change(emailInput, { target: { value: "new@test.com" } });
		fireEvent.click(screen.getByText("Invite"));

		await waitFor(() => {
			expect(mockFetch).toHaveBeenCalledWith(
				expect.stringContaining("/api/users/invite"),
				expect.objectContaining({
					method: "POST",
					body: JSON.stringify({ email: "new@test.com", role: "admin" }),
				}),
			);
		});
	});

	it("shows error when fetch users returns non-OK", async () => {
		mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });
		(safeJson as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			error: "Server error",
		});
		render(<UserManagement />);
		await waitFor(() => {
			expect(toast.error).toHaveBeenCalled();
		});
	});
});
