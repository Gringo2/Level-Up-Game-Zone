/**
 * @vitest-environment jsdom
 */
import "@testing-library/jest-dom/vitest";
import {
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import { toast } from "sonner";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
	item_name: "Paper Towels",
	description: "Cleaning supplies",
	amount: 12.5,
	category: "Supplies",
	user_id: "u1",
	date: new Date().toISOString(),
	verified: false,
	quantity: 3,
	unit_price: 4.17,
	unit: "pack",
};

const mockFetch = vi.fn();

describe("Expenses", () => {
	afterEach(() => {
		cleanup();
	});
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
				const body = JSON.parse(String(init.body)) as Record<string, unknown>;
				const { editReason: _, amount: rawAmount, ...updates } = body;
				const result = { ...expense, ...updates };
				if (rawAmount !== undefined) result.amount = Number(rawAmount);
				return Promise.resolve(jsonResponse(result));
			}
			if (init?.method === "POST") {
				const body = JSON.parse(String(init.body)) as {
					item_name: string;
					description: string;
					amount: string;
					category: string;
				};
				return Promise.resolve(
					jsonResponse({
						...expense,
						id: "exp-new",
						item_name: body.item_name,
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
		expect(await screen.findByText("Paper Towels")).toBeInTheDocument();
		expect(screen.getByText(/12\.50/)).toBeInTheDocument();
		expect(screen.getByText("Supplies")).toBeInTheDocument();
		expect(screen.getByText("Unverified")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Verify" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();
	});

	it("renders the empty state when there are no expenses", async () => {
		mockFetch.mockImplementation(() => jsonResponse([]));
		render(<Expenses />);
		expect(
			await screen.findByText("No expenses found for the selected date range."),
		).toBeInTheDocument();
	});

	it("shows an error toast when loading fails", async () => {
		mockFetch.mockImplementation(() =>
			jsonResponse({ error: "boom" }, false, 500),
		);
		render(<Expenses />);
		await waitFor(() =>
			expect(toast.error).toHaveBeenCalledWith("Failed to load expenses"),
		);
	});

	it("logs a new expense via POST", async () => {
		mockFetch.mockImplementationOnce(() => jsonResponse([expense]));
		mockFetch.mockImplementationOnce(() =>
			jsonResponse([{ name: "Supplies", isActive: true }]),
		);
		render(<Expenses />);
		await screen.findByText("Cleaning supplies");

		fireEvent.change(screen.getByLabelText("Item Name"), {
			target: { value: "New Mop" },
		});
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
		const [, init] = mockFetch.mock.calls[2] as [string, RequestInit];
		expect(JSON.parse(String(init.body))).toEqual({
			item_name: "New Mop",
			description: "New mop",
			amount: "8",
			category: "Supplies",
			date: expect.any(String),
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
		fireEvent.click(screen.getByRole("button", { name: "Confirm Delete" }));

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

	it("populates unit fields when editing an expense with unit data", async () => {
		render(<Expenses />);
		await screen.findByText("Cleaning supplies");
		fireEvent.click(screen.getByRole("button", { name: "Edit" }));

		expect(screen.getByLabelText("Item Name")).toHaveValue("Paper Towels");
		expect(screen.getByLabelText("Qty")).toHaveValue(3);
		expect(screen.getByLabelText("Unit Price ($)")).toHaveValue(4.17);
		expect(screen.getByLabelText("Unit")).toHaveValue("pack");
	});

	it("sends unit fields in PUT body when editing an expense with unit data", async () => {
		render(<Expenses />);
		await screen.findByText("Cleaning supplies");
		fireEvent.click(screen.getByRole("button", { name: "Edit" }));

		const reason = screen.getByLabelText("Reason for Edit (Required)");
		fireEvent.change(reason, { target: { value: "Updated quantity" } });
		fireEvent.change(screen.getByLabelText("Qty"), {
			target: { value: "5" },
		});
		const form = screen.getByText("Update Expense").closest("form");
		fireEvent.submit(form as HTMLFormElement);

		await waitFor(() => {
			const putCall = mockFetch.mock.calls.find(
				(call: [string, RequestInit]) =>
					call[1]?.method === "PUT" &&
					String(call[0]).includes("/api/expenses/exp-1"),
			);
			expect(putCall).toBeDefined();
			const body = JSON.parse(String(putCall?.[1]?.body));
			expect(body.quantity).toBe(5);
			expect(body.unit_price).toBe(4.17);
			expect(body.unit).toBe("pack");
			expect(body.item_name).toBe("Paper Towels");
		});
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

	it("shows error toast when POST expense fails", async () => {
		mockFetch.mockImplementationOnce(() => jsonResponse([expense]));
		mockFetch.mockImplementationOnce(() =>
			jsonResponse([{ name: "Supplies", isActive: true }]),
		);
		render(<Expenses />);
		await screen.findByText("Cleaning supplies");

		const failFetch = vi
			.fn()
			.mockImplementation((_url: string, init?: RequestInit) => {
				if (init?.method === "POST") {
					return Promise.reject(new Error("Server error"));
				}
				return jsonResponse([expense]);
			});
		global.fetch = failFetch as unknown as typeof fetch;

		fireEvent.change(
			screen.getByLabelText("Description (e.g., Cleaning supplies)"),
			{ target: { value: "New mop" } },
		);
		fireEvent.change(screen.getByLabelText("Amount ($)"), {
			target: { value: "8" },
		});
		const form = screen.getByText("New Expense").closest("form");
		fireEvent.submit(form as HTMLFormElement);

		await waitFor(() =>
			expect(toast.error).toHaveBeenCalledWith("Failed to save expense"),
		);
	});

	it("shows error toast when PUT expense fails in edit mode", async () => {
		mockFetch.mockImplementationOnce(() => jsonResponse([expense]));
		render(<Expenses />);
		await screen.findByText("Cleaning supplies");
		fireEvent.click(screen.getByRole("button", { name: "Edit" }));

		const failFetch = vi
			.fn()
			.mockImplementation((url: string, init?: RequestInit) => {
				if (init?.method === "PUT" && !url.endsWith("/verify")) {
					return Promise.reject(new Error("Server error"));
				}
				return jsonResponse([expense]);
			});
		global.fetch = failFetch as unknown as typeof fetch;

		fireEvent.change(screen.getByLabelText("Reason for Edit (Required)"), {
			target: { value: "Correction" },
		});
		const form = screen.getByText("Update Expense").closest("form");
		fireEvent.submit(form as HTMLFormElement);

		await waitFor(() =>
			expect(toast.error).toHaveBeenCalledWith("Failed to save expense"),
		);
	});

	it("sends selected category in POST body", async () => {
		mockFetch.mockImplementationOnce(() => jsonResponse([expense]));
		mockFetch.mockImplementationOnce(() =>
			jsonResponse([
				{ name: "Supplies", isActive: true },
				{ name: "Wages", isActive: true },
			]),
		);
		render(<Expenses />);
		await screen.findByText("Cleaning supplies");

		fireEvent.change(
			screen.getByLabelText("Description (e.g., Cleaning supplies)"),
			{ target: { value: "Payroll" } },
		);
		fireEvent.change(screen.getByLabelText("Amount ($)"), {
			target: { value: "50" },
		});
		fireEvent.change(screen.getByLabelText("Category"), {
			target: { value: "Wages" },
		});
		const form = screen.getByText("New Expense").closest("form");
		fireEvent.submit(form as HTMLFormElement);

		await waitFor(() =>
			expect(mockFetch).toHaveBeenCalledWith(
				expect.stringMatching(/\/api\/expenses$/),
				expect.objectContaining({ method: "POST" }),
			),
		);
		const postCalls = mockFetch.mock.calls.filter(
			([, init]) => (init as RequestInit | undefined)?.method === "POST",
		);
		const body = JSON.parse(String((postCalls[0][1] as RequestInit).body));
		expect(body.category).toBe("Wages");
	});

	it("dismisses delete confirmation when Cancel is clicked", async () => {
		render(<Expenses />);
		await screen.findByText("Cleaning supplies");
		fireEvent.click(screen.getByRole("button", { name: "" }));

		expect(
			screen.getByPlaceholderText("Reason for deletion..."),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Confirm Delete" }),
		).toBeInTheDocument();

		fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

		expect(
			screen.queryByPlaceholderText("Reason for deletion..."),
		).not.toBeInTheDocument();
		expect(screen.getByText("Cleaning supplies")).toBeInTheDocument();
	});

	it("shows error toast when delete expense fails", async () => {
		render(<Expenses />);
		await screen.findByText("Cleaning supplies");
		fireEvent.click(screen.getByRole("button", { name: "" }));

		const failFetch = vi
			.fn()
			.mockImplementation((_url: string, init?: RequestInit) => {
				if (init?.method === "DELETE") {
					return Promise.reject(new Error("Server error"));
				}
				return jsonResponse([expense]);
			});
		global.fetch = failFetch as unknown as typeof fetch;

		fireEvent.change(screen.getByPlaceholderText("Reason for deletion..."), {
			target: { value: "Duplicate" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Confirm Delete" }));

		await waitFor(() =>
			expect(toast.error).toHaveBeenCalledWith("Failed to delete expense"),
		);
	});

	it("shows error toast when verify expense fails", async () => {
		render(<Expenses />);
		await screen.findByText("Cleaning supplies");

		const failFetch = vi
			.fn()
			.mockImplementation((url: string, init?: RequestInit) => {
				if (init?.method === "PUT" && url.endsWith("/verify")) {
					return Promise.reject(new Error("Server error"));
				}
				return jsonResponse([expense]);
			});
		global.fetch = failFetch as unknown as typeof fetch;

		fireEvent.click(screen.getByRole("button", { name: "Verify" }));

		await waitFor(() =>
			expect(toast.error).toHaveBeenCalledWith("Failed to verify expense"),
		);
	});

	it("renders the Manage Categories section", async () => {
		render(<Expenses />);
		await screen.findByText("Cleaning supplies");
		expect(screen.getByText("Manage Categories")).toBeInTheDocument();
		expect(
			screen.getByPlaceholderText("New category name"),
		).toBeInTheDocument();
	});

	it("creates a new category via POST", async () => {
		mockFetch.mockImplementationOnce(() => jsonResponse([expense]));
		mockFetch.mockImplementationOnce(() =>
			jsonResponse([{ id: "c1", name: "Supplies", isActive: true }]),
		);
		render(<Expenses />);
		await screen.findByText("Cleaning supplies");

		const failFetch = vi
			.fn()
			.mockImplementation((url: string, init?: RequestInit) => {
				if (init?.method === "POST" && url.includes("expense-categories")) {
					return Promise.resolve(
						jsonResponse({
							id: "c-new",
							name: "Transport",
							isActive: true,
							created_at: new Date().toISOString(),
						}),
					);
				}
				if (init?.method === "POST") {
					return Promise.resolve(jsonResponse({ ...expense, id: "exp-new" }));
				}
				if (url.includes("expense-categories")) {
					return jsonResponse([{ id: "c1", name: "Supplies", isActive: true }]);
				}
				return jsonResponse([expense]);
			});
		global.fetch = failFetch as unknown as typeof fetch;

		fireEvent.change(screen.getByPlaceholderText("New category name"), {
			target: { value: "Transport" },
		});
		fireEvent.click(screen.getByText("Add"));

		await waitFor(() =>
			expect(toast.success).toHaveBeenCalledWith("Category created!"),
		);
		const transportItems = screen.getAllByText("Transport");
		expect(transportItems.length).toBeGreaterThanOrEqual(2);
	});

	it("shows error toast when creating a duplicate category fails", async () => {
		mockFetch.mockImplementationOnce(() => jsonResponse([expense]));
		mockFetch.mockImplementationOnce(() =>
			jsonResponse([{ id: "c1", name: "Supplies", isActive: true }]),
		);
		render(<Expenses />);
		await screen.findByText("Cleaning supplies");

		const failFetch = vi
			.fn()
			.mockImplementation((url: string, init?: RequestInit) => {
				if (init?.method === "POST" && url.includes("expense-categories")) {
					return Promise.resolve(
						jsonResponse(
							{ error: "A category with this name already exists" },
							false,
							409,
						),
					);
				}
				if (url.includes("expense-categories")) {
					return jsonResponse([{ id: "c1", name: "Supplies", isActive: true }]);
				}
				return jsonResponse([expense]);
			});
		global.fetch = failFetch as unknown as typeof fetch;

		fireEvent.change(screen.getByPlaceholderText("New category name"), {
			target: { value: "Supplies" },
		});
		fireEvent.click(screen.getByText("Add"));

		await waitFor(() =>
			expect(toast.error).toHaveBeenCalledWith(
				"A category with this name already exists",
			),
		);
	});

	it("deactivates a category via PUT", async () => {
		mockFetch.mockImplementationOnce(() => jsonResponse([expense]));
		mockFetch.mockImplementationOnce(() =>
			jsonResponse([
				{ id: "c1", name: "Supplies", isActive: true },
				{ id: "c2", name: "Wages", isActive: true },
			]),
		);
		render(<Expenses />);
		await screen.findByText("Cleaning supplies");

		const deactivateButtons = screen
			.getAllByRole("button")
			.filter((btn) => btn.querySelector("svg") && !btn.textContent);
		const deactivateBtn = deactivateButtons[deactivateButtons.length - 1];

		const failFetch = vi
			.fn()
			.mockImplementation((url: string, init?: RequestInit) => {
				if (init?.method === "PUT" && url.includes("expense-categories")) {
					const body = JSON.parse(String(init.body)) as { isActive?: boolean };
					if (body.isActive === false) {
						return Promise.resolve(
							jsonResponse({ id: "c2", name: "Wages", isActive: false }),
						);
					}
					return jsonResponse({ ok: true });
				}
				if (url.includes("expense-categories")) {
					return jsonResponse([
						{ id: "c1", name: "Supplies", isActive: true },
						{ id: "c2", name: "Wages", isActive: true },
					]);
				}
				return jsonResponse([expense]);
			});
		global.fetch = failFetch as unknown as typeof fetch;

		fireEvent.click(deactivateBtn);

		await waitFor(() =>
			expect(toast.success).toHaveBeenCalledWith("Category deactivated!"),
		);
	});
});
