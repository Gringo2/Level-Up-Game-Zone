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
		expect(screen.getAllByText(/12\.50/).length).toBeGreaterThan(0);
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
		mockFetch.mockImplementation((url: string, init?: RequestInit) => {
			if (String(url).includes("expense-categories")) {
				return jsonResponse([{ name: "Supplies", isActive: true }]);
			}
			if (init?.method === "POST") {
				return jsonResponse({
					...expense,
					item_name: "New Mop",
					description: "New mop",
				});
			}
			return jsonResponse([expense]);
		});
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

	it("TD-053: disables sibling row actions while verification is in flight", async () => {
		let resolveVerify: (v: Response) => void = () => {};
		mockFetch.mockImplementation((url: string, init?: RequestInit) => {
			if (init?.method === "PUT" && url.endsWith("/verify")) {
				return new Promise<Response>((resolve) => {
					resolveVerify = resolve;
				});
			}
			return Promise.resolve(jsonResponse([expense]));
		});
		render(<Expenses />);
		await screen.findByText("Cleaning supplies");

		fireEvent.click(screen.getByRole("button", { name: "Verify" }));

		expect(screen.getByRole("button", { name: "Verify" })).toBeDisabled();
		expect(screen.getByRole("button", { name: "Edit" })).toBeDisabled();
		expect(
			screen.getByRole("button", { name: "Delete expense" }),
		).toBeDisabled();

		await waitFor(() =>
			expect(mockFetch).toHaveBeenCalledWith(
				expect.stringMatching(/\/verify$/),
				expect.objectContaining({ method: "PUT" }),
			),
		);
		resolveVerify(jsonResponse({ ok: true }));
		await waitFor(() =>
			expect(toast.success).toHaveBeenCalledWith("Expense verified!"),
		);
		await waitFor(() =>
			expect(screen.getByText("Verified")).toBeInTheDocument(),
		);
	});

	it("deletes an expense via DELETE after a reason is provided", async () => {
		render(<Expenses />);
		await screen.findByText("Cleaning supplies");
		const deleteBtn = screen
			.getAllByRole("button")
			.filter(
				(btn) =>
					btn.querySelector("svg") &&
					!btn.textContent &&
					btn.className.includes("text-red"),
			)[0];
		fireEvent.click(deleteBtn);

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
		mockFetch.mockImplementation((url: string) => {
			if (String(url).includes("expense-categories")) {
				return jsonResponse([{ name: "Supplies", isActive: true }]);
			}
			return jsonResponse([expense]);
		});
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

		fireEvent.change(screen.getByLabelText("Item Name"), {
			target: { value: "Mop" },
		});
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
		mockFetch.mockImplementation((url: string, init?: RequestInit) => {
			if (String(url).includes("expense-categories")) {
				return jsonResponse([
					{ name: "Supplies", isActive: true },
					{ name: "Wages", isActive: true },
				]);
			}
			if (init?.method === "POST") {
				return jsonResponse({ ...expense, category: "Wages" });
			}
			return jsonResponse([expense]);
		});
		render(<Expenses />);
		await screen.findByText("Cleaning supplies");

		fireEvent.change(screen.getByLabelText("Item Name"), {
			target: { value: "Payroll" },
		});
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
		const deleteBtn = screen
			.getAllByRole("button")
			.filter(
				(btn) =>
					btn.querySelector("svg") &&
					!btn.textContent &&
					btn.className.includes("text-red"),
			)[0];
		fireEvent.click(deleteBtn);

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
		const deleteBtn = screen
			.getAllByRole("button")
			.filter(
				(btn) =>
					btn.querySelector("svg") &&
					!btn.textContent &&
					btn.className.includes("text-red"),
			)[0];
		fireEvent.click(deleteBtn);

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

	it("refetches expenses when the tab becomes visible again", async () => {
		mockFetch.mockImplementation((url: string) => {
			if (String(url).includes("expense-categories")) {
				return jsonResponse([{ name: "Supplies", isActive: true }]);
			}
			return jsonResponse([expense]);
		});
		render(<Expenses />);
		await waitFor(() => expect(mockFetch).toHaveBeenCalled());

		const callsBefore = mockFetch.mock.calls.length;
		document.dispatchEvent(new Event("visibilitychange"));

		await waitFor(() => {
			expect(mockFetch.mock.calls.length).toBeGreaterThan(callsBefore);
		});
	});

	it("auto-calculates amount from quantity and unit price", async () => {
		mockFetch.mockImplementation((url: string) => {
			if (String(url).includes("expense-categories")) {
				return jsonResponse([{ id: "c1", name: "Supplies", isActive: true }]);
			}
			return jsonResponse([expense]);
		});
		render(<Expenses />);
		await screen.findByText("Cleaning supplies");

		fireEvent.change(screen.getByLabelText("Item Name"), {
			target: { value: "Rope" },
		});
		fireEvent.change(
			screen.getByLabelText("Description (e.g., Cleaning supplies)"),
			{
				target: { value: "Climbing rope" },
			},
		);
		fireEvent.change(screen.getByLabelText("Qty"), {
			target: { value: "4" },
		});
		fireEvent.change(screen.getByLabelText("Unit Price ($)"), {
			target: { value: "2.5" },
		});
		fireEvent.change(screen.getByLabelText("Unit"), {
			target: { value: "m" },
		});

		expect(screen.getByLabelText("Amount ($)")).toHaveValue(10);
		expect(screen.getByLabelText("Unit")).toHaveValue("m");
	});

	it("filters expenses by date range", async () => {
		mockFetch.mockImplementation((url: string) => {
			if (String(url).includes("expense-categories")) {
				return jsonResponse([{ id: "c1", name: "Supplies", isActive: true }]);
			}
			return jsonResponse([expense]);
		});
		render(<Expenses />);
		await screen.findByText("Cleaning supplies");

		fireEvent.change(screen.getByLabelText("From"), {
			target: { value: "2024-01-01" },
		});
		fireEvent.change(screen.getByLabelText("To"), {
			target: { value: "2030-12-31" },
		});

		expect(screen.getByText("Cleaning supplies")).toBeInTheDocument();
	});

	describe("day grouping + pagination (M-72)", () => {
		const day1 = new Date("2026-08-21T18:42:00").toISOString(); // Fri
		const day2 = new Date("2026-08-20T09:15:00").toISOString(); // Thu
		const sixExpenses = [1, 2, 3, 4, 5].map((n) => ({
			...expense,
			id: `exp-${n}`,
			item_name: `Item ${n}`,
			description: "",
			amount: n + 0.5,
			date: day1,
		}));
		sixExpenses.push({
			...expense,
			id: "exp-6",
			item_name: "Unique Widget X",
			description: "",
			amount: 12.5,
			date: day2,
		});

		const mockList = () => {
			mockFetch.mockImplementation((url: string) => {
				if (String(url).includes("expense-categories")) {
					return jsonResponse([{ name: "Supplies", isActive: true }]);
				}
				return jsonResponse(sixExpenses);
			});
		};

		it("shows pager only beyond page size and navigates with bounds", async () => {
			mockList();
			render(<Expenses />);
			await screen.findByText("Item 4");
			expect(screen.queryByText("Unique Widget X")).not.toBeInTheDocument();
			expect(screen.getByText("Page 1 of 2")).toBeInTheDocument();
			const prev = screen.getByRole("button", { name: "Previous" });
			const next = screen.getByRole("button", { name: "Next" });
			expect(prev).toBeDisabled();

			fireEvent.click(next);
			expect(await screen.findByText("Unique Widget X")).toBeInTheDocument();
			expect(screen.getByText("Page 2 of 2")).toBeInTheDocument();
			expect(next).toBeDisabled();
			expect(prev).toBeEnabled();

			fireEvent.click(prev);
			expect(await screen.findByText("Item 4")).toBeInTheDocument();
		});

		it("renders weekday day headers and no per-day totals", async () => {
			mockList();
			render(<Expenses />);
			const header = await screen.findByText(/Fri, Aug 21/);
			expect(header).toBeInTheDocument();
			expect(
				screen.queryByTestId(/expenses-day-subtotal-/),
			).not.toBeInTheDocument();
		});

		it("resets to page 1 when the list is refetched", async () => {
			mockList();
			render(<Expenses />);
			await screen.findByText("Page 1 of 2");
			fireEvent.click(screen.getByRole("button", { name: "Next" }));
			expect(await screen.findByText("Unique Widget X")).toBeInTheDocument();

			document.dispatchEvent(new Event("visibilitychange"));

			expect(await screen.findByText("Page 1 of 2")).toBeInTheDocument();
			expect(screen.getByText("Item 1")).toBeInTheDocument();
		});

		it("promotes a single period-total banner for the selected range", async () => {
			mockList();
			render(<Expenses />);
			const banner = await screen.findByTestId("expenses-range-summary");
			expect(banner).toHaveTextContent("6 expenses");
			expect(banner).toHaveTextContent("Total $30.00");
		});
	});

	it("no longer hosts Manage Categories (moved to Admin)", async () => {
		mockFetch.mockImplementation((url: string) => {
			if (String(url).includes("expense-categories")) {
				return jsonResponse([{ id: "c1", name: "Supplies", isActive: true }]);
			}
			return jsonResponse([expense]);
		});
		render(<Expenses />);
		await screen.findByText("Paper Towels");
		expect(screen.queryByText("Manage Categories")).not.toBeInTheDocument();
	});

	it("TD-047: invalid range shows hint and skips refetch", async () => {
		render(<Expenses />);
		await screen.findByText("Paper Towels");
		const callsBefore = mockFetch.mock.calls.length;

		fireEvent.change(screen.getByLabelText("From"), {
			target: { value: "2026-08-23" },
		});
		fireEvent.change(screen.getByLabelText("To"), {
			target: { value: "2026-08-20" },
		});

		expect(
			screen.getByText("From date must be on or before To"),
		).toBeInTheDocument();
		expect(mockFetch.mock.calls.length).toBe(callsBefore);
	});

	it("TD-048: shows inline loading indicator while fetching", async () => {
		let resolveFetch: (v: Response) => void = () => {};
		mockFetch.mockImplementation((url: string) => {
			if (String(url).includes("expense-categories")) {
				return jsonResponse([{ name: "Supplies", isActive: true }]);
			}
			return new Promise<Response>((r) => {
				resolveFetch = r;
			});
		});

		render(<Expenses />);
		expect(await screen.findByTestId("history-loading")).toBeInTheDocument();

		resolveFetch(jsonResponse([expense]));
		await screen.findByText("Paper Towels");
		expect(screen.queryByTestId("history-loading")).not.toBeInTheDocument();
	});

	it("TD-050: delete button exposes an accessible name", async () => {
		render(<Expenses />);
		await screen.findByText("Paper Towels");
		expect(
			screen.getByRole("button", { name: "Delete expense" }),
		).toBeInTheDocument();
	});
	it("TD-032: consumes pagination envelope and appends older pages", async () => {
		const first = { ...expense, id: "e1" };
		const older = { ...expense, id: "e0", item_name: "Stapler" };
		mockFetch.mockImplementation((url: string) => {
			const u = String(url);
			if (u.includes("expense-categories")) {
				return Promise.resolve(jsonResponse([]));
			}
			if (u.includes("cursor=")) {
				return Promise.resolve(
					jsonResponse({ data: [older], nextCursor: null }),
				);
			}
			return Promise.resolve(jsonResponse({ data: [first], nextCursor: "c2" }));
		});

		render(<Expenses />);
		expect(await screen.findByTestId("load-older")).toBeInTheDocument();

		fireEvent.click(screen.getByRole("button", { name: "Load older" }));

		expect(await screen.findByText("Stapler")).toBeInTheDocument();
	});
});
