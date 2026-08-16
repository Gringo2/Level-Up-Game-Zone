/**
 * @vitest-environment jsdom
 */
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuth } from "../../contexts/AuthContext.js";
import { Expenses } from "../../pages/Expenses.js";

vi.mock("../../firebase", () => ({
	auth: {
		currentUser: { getIdToken: vi.fn().mockResolvedValue("mock-token") },
	},
}));

vi.mock("sonner", () => ({
	toast: { error: vi.fn(), success: vi.fn() },
}));

vi.mock("../../contexts/AuthContext.js", () => ({
	useAuth: vi.fn(),
}));

const jsonResponse = (data: unknown, ok = true, status = 200) =>
	new Response(JSON.stringify(data), {
		status,
		statusText: ok ? "OK" : "Internal Server Error",
		headers: { "Content-Type": "application/json" },
	});

const managerUser = {
	uid: "u1",
	email: "manager@example.com",
	displayName: "Manager",
	role: "manager" as const,
};

const expense = {
	id: "exp-1",
	description: "Cleaning supplies",
	amount: 12.5,
	category: "Supplies",
	user_id: "u1",
	date: new Date().toISOString(),
	verified: false,
};

const mockFetch = vi.fn();

describe("Expenses", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(useAuth).mockReturnValue({ user: managerUser, loading: false });
		window.scrollTo = vi.fn();
		mockFetch.mockImplementation((url: string, init?: RequestInit) => {
			if (init?.method === "DELETE") {
				return Promise.resolve(jsonResponse({ ok: true }));
			}
			if (init?.method === "PUT" && url.endsWith("/verify")) {
				return Promise.resolve(jsonResponse({ ok: true }));
			}
			if (init?.method === "PUT") {
				return Promise.resolve(jsonResponse({ ok: true }));
			}
			if (init?.method === "POST") {
				const body = JSON.parse(String(init.body)) as {
					description: string;
					amount: string;
					category: string;
				};
				return Promise.resolve(
					jsonResponse({
						...expense,
						id: "exp-new",
						description: body.description,
						amount: parseFloat(body.amount),
						category: body.category,
					}),
				);
			}
			return Promise.resolve(jsonResponse([expense]));
		});
		global.fetch = mockFetch as unknown as typeof fetch;
	});

	it("renders today's expenses after loading", async () => {
		render(<Expenses />);
		expect(await screen.findByText("Cleaning supplies")).toBeInTheDocument();
		expect(screen.getByText(/12\.50/)).toBeInTheDocument();
		expect(screen.getByText("Supplies")).toBeInTheDocument();
		expect(screen.getByText("Unverified")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Verify" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();
	});

	it("renders the empty state when there are no expenses", async () => {
		mockFetch.mockResolvedValue(jsonResponse([]));
		render(<Expenses />);
		expect(
			await screen.findByText("No expenses logged today yet."),
		).toBeInTheDocument();
	});

	it("shows an error toast when loading fails", async () => {
		mockFetch.mockResolvedValue(jsonResponse({ error: "boom" }, false, 500));
		render(<Expenses />);
		await waitFor(() =>
			expect(toast.error).toHaveBeenCalledWith("Failed to load expenses"),
		);
	});

	it("logs a new expense via POST", async () => {
		mockFetch.mockResolvedValueOnce(jsonResponse([expense]));
		render(<Expenses />);
		await screen.findByText("Cleaning supplies");

		fireEvent.change(
			screen.getByLabelText("Description (e.g., Cleaning supplies)"),
			{
				target: { value: "New mop" },
			},
		);
		fireEvent.change(screen.getByLabelText("Amount ($)"), {
			target: { value: "8" },
		});
		const form = screen.getByText("New Expense").closest("form");
		fireEvent.submit(form as HTMLFormElement);

		await waitFor(() =>
			expect(mockFetch).toHaveBeenCalledWith(
				expect.stringMatching(/\/api\/expenses$/),
				expect.objectContaining({ method: "POST" }),
			),
		);
		await waitFor(() =>
			expect(toast.success).toHaveBeenCalledWith(
				"Expense logged successfully!",
			),
		);
		const [, init] = mockFetch.mock.calls[1] as [string, RequestInit];
		expect(JSON.parse(String(init.body))).toEqual({
			description: "New mop",
			amount: "8",
			category: "Misc",
		});
		expect(await screen.findByText("New mop")).toBeInTheDocument();
	});

	it("verifies an expense via PUT", async () => {
		render(<Expenses />);
		await screen.findByText("Cleaning supplies");
		fireEvent.click(screen.getByRole("button", { name: "Verify" }));

		await waitFor(() =>
			expect(mockFetch).toHaveBeenCalledWith(
				expect.stringMatching(/\/api\/expenses\/exp-1\/verify$/),
				expect.objectContaining({ method: "PUT" }),
			),
		);
		await waitFor(() =>
			expect(toast.success).toHaveBeenCalledWith("Expense verified!"),
		);
		expect(await screen.findByText("Verified")).toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: "Verify" }),
		).not.toBeInTheDocument();
	});

	it("deletes an expense via DELETE after a reason is provided", async () => {
		render(<Expenses />);
		await screen.findByText("Cleaning supplies");
		fireEvent.click(screen.getByRole("button", { name: "" }));

		const reason = screen.getByPlaceholderText("Reason for deletion...");
		fireEvent.change(reason, { target: { value: "Duplicate entry" } });
		fireEvent.click(screen.getByRole("button", { name: "Confirm" }));

		await waitFor(() =>
			expect(mockFetch).toHaveBeenCalledWith(
				expect.stringMatching(/\/api\/expenses\/exp-1$/),
				expect.objectContaining({ method: "DELETE" }),
			),
		);
		await waitFor(() =>
			expect(toast.success).toHaveBeenCalledWith(
				"Expense deleted successfully!",
			),
		);
		await waitFor(() =>
			expect(screen.queryByText("Cleaning supplies")).not.toBeInTheDocument(),
		);
	});

	it("edits an expense via PUT when a reason is provided", async () => {
		render(<Expenses />);
		await screen.findByText("Cleaning supplies");
		fireEvent.click(screen.getByRole("button", { name: "Edit" }));

		const reason = screen.getByLabelText("Reason for Edit (Required)");
		fireEvent.change(reason, { target: { value: "Typo in amount" } });
		fireEvent.change(
			screen.getByLabelText("Description (e.g., Cleaning supplies)"),
			{
				target: { value: "Cleaning supplies (corrected)" },
			},
		);
		const form = screen.getByText("Update Expense").closest("form");
		fireEvent.submit(form as HTMLFormElement);

		await waitFor(() =>
			expect(mockFetch).toHaveBeenCalledWith(
				expect.stringMatching(/\/api\/expenses\/exp-1$/),
				expect.objectContaining({ method: "PUT" }),
			),
		);
		await waitFor(() =>
			expect(toast.success).toHaveBeenCalledWith(
				"Expense updated successfully!",
			),
		);
		expect(
			await screen.findByText("Cleaning supplies (corrected)"),
		).toBeInTheDocument();
	});

	it("hides management actions from staff users", async () => {
		vi.mocked(useAuth).mockReturnValue({
			user: {
				uid: "u2",
				email: "s@example.com",
				displayName: "Staff",
				role: "staff",
			},
			loading: false,
		});
		render(<Expenses />);
		await screen.findByText("Cleaning supplies");
		expect(
			screen.queryByRole("button", { name: "Verify" }),
		).not.toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: "Edit" }),
		).not.toBeInTheDocument();
	});

	it("does not submit when there is no user", async () => {
		vi.mocked(useAuth).mockReturnValue({ user: null, loading: false });
		render(<Expenses />);
		await screen.findByText("Cleaning supplies");

		fireEvent.change(
			screen.getByLabelText("Description (e.g., Cleaning supplies)"),
			{
				target: { value: "New mop" },
			},
		);
		fireEvent.change(screen.getByLabelText("Amount ($)"), {
			target: { value: "8" },
		});
		const form = screen.getByText("New Expense").closest("form");
		fireEvent.submit(form as HTMLFormElement);

		const posts = mockFetch.mock.calls.filter(
			([, init]) => (init as RequestInit | undefined)?.method === "POST",
		);
		expect(posts).toHaveLength(0);
	});
});
