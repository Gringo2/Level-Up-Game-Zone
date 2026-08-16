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

vi.mock("../../lib/api", () => ({
	API_BASE: "http://localhost:3001",
	safeJson: vi.fn(),
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

const mockUsers = [
	{ uid: "u1", email: "alice@test.com", displayName: "Alice", role: "staff" },
	{ uid: "u2", email: "bob@test.com", displayName: "Bob", role: "manager" },
];

describe("UserManagement", () => {
	const originalConfirm = window.confirm;
	beforeEach(() => {
		vi.restoreAllMocks();
		mockFetch.mockReset();
		(safeJson as ReturnType<typeof vi.fn>).mockReset();
		mockFetch.mockResolvedValue({ ok: true, status: 200 });
		(safeJson as ReturnType<typeof vi.fn>).mockResolvedValue(mockUsers);
		window.confirm = originalConfirm;
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
			expect(mockFetch).toHaveBeenCalledWith(
				expect.stringContaining("/api/users/u1/role"),
				expect.objectContaining({ method: "PUT" }),
			);
		});
	});

	it("sends DELETE request when delete is confirmed", async () => {
		window.confirm = vi.fn().mockReturnValue(true);
		render(<UserManagement />);
		await waitFor(() => {
			expect(screen.getByText("Alice")).toBeDefined();
		});

		const deleteButtons = screen.getAllByTitle("Delete user account");
		fireEvent.click(deleteButtons[0]);

		await waitFor(() => {
			expect(window.confirm).toHaveBeenCalled();
			expect(mockFetch).toHaveBeenCalledWith(
				expect.stringContaining("/api/users/u1"),
				expect.objectContaining({ method: "DELETE" }),
			);
		});
	});

	it("does not call API when delete is cancelled", async () => {
		window.confirm = vi.fn().mockReturnValue(false);
		render(<UserManagement />);
		await waitFor(() => {
			expect(screen.getByText("Alice")).toBeDefined();
		});

		const initialCallCount = mockFetch.mock.calls.length;
		const deleteButtons = screen.getAllByTitle("Delete user account");
		fireEvent.click(deleteButtons[0]);

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
		const emailInput = screen.getByPlaceholderText("Email address");
		fireEvent.change(emailInput, { target: { value: "dup@test.com" } });
		fireEvent.click(screen.getByText("Invite"));

		await waitFor(() => {
			expect(toast.error).toHaveBeenCalled();
		});
	});
});
