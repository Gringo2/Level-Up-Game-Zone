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
	within,
} from "@testing-library/react";
import { toast } from "sonner";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useShift } from "../../contexts/ShiftContext.js";
import { Dashboard } from "../../pages/Dashboard.js";

vi.mock("../../firebase", () => ({
	auth: {
		currentUser: { getIdToken: vi.fn().mockResolvedValue("mock-token") },
	},
}));

vi.mock("sonner", () => ({
	toast: { error: vi.fn(), success: vi.fn() },
}));

vi.mock("../../contexts/ShiftContext.js", () => ({
	useShift: vi.fn(),
}));

vi.mock("../../contexts/AuthContext.js", () => ({
	useAuth: () => ({
		user: {
			uid: "u1",
			email: "alice@example.com",
			displayName: "Alice",
			role: "manager",
		},
		loading: false,
	}),
}));

const jsonResponse = (data: unknown, ok = true, status = 200) =>
	new Response(JSON.stringify(data), {
		status,
		statusText: ok ? "OK" : "Internal Server Error",
		headers: { "Content-Type": "application/json" },
	});

const shift = {
	id: "shift-1",
	manager_id: "u1",
	manager_name: "Alice",
	start_time: new Date(Date.now() - 3600000).toISOString(),
	opening_float: 100,
	status: "OPEN" as const,
};

const gameSalesLogs = [
	{
		id: "s1",
		game_id: "g1",
		game_name: "PS4",
		quantity_sold: 2,
		rate_applied: 5,
		calculated_total: 10,
		user_id: "u1",
		date: new Date().toISOString(),
	},
];

const kenoLogs = [
	{
		id: "k1",
		sales: 100,
		payouts: 40,
		net_profit: 60,
		user_id: "u1",
		date: new Date().toISOString(),
	},
];

const credits = [
	{
		id: "c1",
		employee_name: "Bob",
		amount: 20,
		status: "Pending",
		user_id: "u1",
		date: new Date().toISOString(),
	},
];

const expenses = [
	{
		id: "e1",
		description: "Cleaning",
		amount: 12.5,
		category: "Supplies",
		user_id: "u1",
		date: new Date().toISOString(),
	},
];

const mockFetch = vi.fn();
const refetchShiftMock = vi.fn();

describe("Dashboard", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(useShift).mockReturnValue({
			activeShift: shift,
			loadingShift: false,
			refetchShift: refetchShiftMock,
		});
		window.print = vi.fn();
		mockFetch.mockImplementation((url: string) => {
			if (url.includes("/api/sales")) {
				return jsonResponse(gameSalesLogs);
			}
			if (url.includes("/api/keno")) {
				return jsonResponse(kenoLogs);
			}
			if (url.includes("/api/credits")) {
				return jsonResponse(credits);
			}
			if (url.includes("/api/expenses")) {
				return jsonResponse(expenses);
			}
			if (url.includes("/close") || url.includes("/float")) {
				return jsonResponse({ ok: true });
			}
			return jsonResponse({ error: "not found" }, false, 404);
		});
		global.fetch = mockFetch as unknown as typeof fetch;
	});

	afterEach(() => {
		cleanup();
	});

	it("renders dashboard totals and the active shift card", async () => {
		render(<Dashboard />);
		expect(await screen.findByText("Active Shift: Alice")).toBeInTheDocument();
		expect(
			within(screen.getByTestId("kpi-game-sales")).getByText("$10.00"),
		).toBeInTheDocument();
		expect(screen.getByText("$60.00")).toBeInTheDocument();
		expect(screen.getByText("-$20.00")).toBeInTheDocument();
		expect(screen.getByText("-$12.50")).toBeInTheDocument();
	});

	it("renders a loader while the shift is loading", async () => {
		vi.mocked(useShift).mockReturnValue({
			activeShift: null,
			loadingShift: true,
			refetchShift: refetchShiftMock,
		});
		render(<Dashboard />);
		expect(document.querySelector(".animate-spin")).toBeInTheDocument();
		expect(screen.queryByText("Dashboard")).not.toBeInTheDocument();
	});

	it("renders totals without an active shift", async () => {
		vi.mocked(useShift).mockReturnValue({
			activeShift: null,
			loadingShift: false,
			refetchShift: refetchShiftMock,
		});
		render(<Dashboard />);
		expect(await screen.findByText("$60.00")).toBeInTheDocument();
		expect(screen.queryByText(/Active Shift:/)).not.toBeInTheDocument();
	});

	it("shows an error toast when dashboard data fails to load", async () => {
		mockFetch.mockResolvedValue(jsonResponse({ error: "boom" }, false, 500));
		render(<Dashboard />);
		await waitFor(() =>
			expect(toast.error).toHaveBeenCalledWith("Failed to load dashboard data"),
		);
	});

	it("requires a reason when the close-shift variance exceeds $2", async () => {
		mockFetch.mockImplementation((url: string) => {
			if (url.includes("/close") || url.includes("/float")) {
				return jsonResponse({ ok: true });
			}
			return jsonResponse([]);
		});
		render(<Dashboard />);
		await screen.findByText("Active Shift: Alice");

		fireEvent.click(
			screen.getByRole("button", { name: "Close Shift (Blind Count)" }),
		);
		fireEvent.change(screen.getByLabelText("Actual Cash Counted ($)"), {
			target: { value: "200" },
		});
		expect(
			screen.getByLabelText("Reason for Variance (Required)"),
		).toBeInTheDocument();

		fireEvent.change(screen.getByLabelText("Reason for Variance (Required)"), {
			target: { value: "Test shortage" },
		});
		const form = screen
			.getByLabelText("Actual Cash Counted ($)")
			.closest("form");
		fireEvent.submit(form as HTMLFormElement);

		expect(screen.getByText("Confirm Shift Closure")).toBeInTheDocument();
		fireEvent.click(screen.getByRole("button", { name: "Yes, Close Shift" }));

		await waitFor(() =>
			expect(mockFetch).toHaveBeenCalledWith(
				expect.stringMatching(/\/api\/shifts\/shift-1\/close$/),
				expect.objectContaining({ method: "POST" }),
			),
		);
		await waitFor(() =>
			expect(toast.success).toHaveBeenCalledWith("Shift closed successfully!"),
		);
		expect(refetchShiftMock).toHaveBeenCalled();
		const [, init] = mockFetch.mock.calls.find(
			([, requestInit]) =>
				(requestInit as RequestInit | undefined)?.method === "POST",
		) as [string, RequestInit];
		expect(JSON.parse(String(init.body))).toEqual({
			actualCashCounted: 200,
			shortageReason: "Test shortage",
		});
	});

	it("closes a shift without a reason when variance is within $2", async () => {
		mockFetch.mockImplementation((url: string) => {
			if (url.includes("/close") || url.includes("/float")) {
				return jsonResponse({ ok: true });
			}
			return jsonResponse([]);
		});
		render(<Dashboard />);
		await screen.findByText("Active Shift: Alice");

		fireEvent.click(
			screen.getByRole("button", { name: "Close Shift (Blind Count)" }),
		);
		fireEvent.change(screen.getByLabelText("Actual Cash Counted ($)"), {
			target: { value: "101" },
		});
		expect(
			screen.queryByLabelText("Reason for Variance (Required)"),
		).not.toBeInTheDocument();

		const form = screen
			.getByLabelText("Actual Cash Counted ($)")
			.closest("form");
		fireEvent.submit(form as HTMLFormElement);

		expect(screen.getByText("Confirm Shift Closure")).toBeInTheDocument();
		fireEvent.click(screen.getByRole("button", { name: "Yes, Close Shift" }));

		await waitFor(() =>
			expect(toast.success).toHaveBeenCalledWith("Shift closed successfully!"),
		);
		const [, init] = mockFetch.mock.calls.find(
			([, requestInit]) =>
				(requestInit as RequestInit | undefined)?.method === "POST",
		) as [string, RequestInit];
		expect(JSON.parse(String(init.body))).toEqual({
			actualCashCounted: 101,
			shortageReason: "",
		});
	});

	it("updates the float via PUT", async () => {
		render(<Dashboard />);
		await screen.findByText("Active Shift: Alice");

		fireEvent.click(screen.getByRole("button", { name: "Update Float" }));
		expect(screen.getByLabelText("New Float Amount ($)")).toHaveValue(100);

		fireEvent.change(screen.getByLabelText("New Float Amount ($)"), {
			target: { value: "150" },
		});
		const form = screen.getByLabelText("New Float Amount ($)").closest("form");
		fireEvent.submit(form as HTMLFormElement);

		await waitFor(() =>
			expect(mockFetch).toHaveBeenCalledWith(
				expect.stringMatching(/\/api\/shifts\/shift-1\/float$/),
				expect.objectContaining({ method: "PUT" }),
			),
		);
		await waitFor(() =>
			expect(toast.success).toHaveBeenCalledWith("Float updated successfully!"),
		);
		expect(refetchShiftMock).toHaveBeenCalled();
	});

	it("prints the safe slip once closing cash is entered", async () => {
		render(<Dashboard />);
		await screen.findByText("Active Shift: Alice");

		fireEvent.click(
			screen.getByRole("button", { name: "Close Shift (Blind Count)" }),
		);
		fireEvent.change(screen.getByLabelText("Actual Cash Counted ($)"), {
			target: { value: "150" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Print Safe Slip" }));

		expect(window.print).toHaveBeenCalled();
	});

	it("shows error toast when update float PUT fails", async () => {
		render(<Dashboard />);
		await screen.findByText("Active Shift: Alice");

		fireEvent.click(screen.getByRole("button", { name: "Update Float" }));
		fireEvent.change(screen.getByLabelText("New Float Amount ($)"), {
			target: { value: "150" },
		});

		mockFetch.mockImplementationOnce(() => Promise.reject(new Error("fail")));

		const form = screen.getByLabelText("New Float Amount ($)").closest("form");
		fireEvent.submit(form as HTMLFormElement);

		await waitFor(() =>
			expect(toast.error).toHaveBeenCalledWith("Failed to update float"),
		);
	});

	it("dismisses update float form when Cancel is clicked", async () => {
		render(<Dashboard />);
		await screen.findByText("Active Shift: Alice");

		fireEvent.click(screen.getByRole("button", { name: "Update Float" }));
		expect(screen.getByLabelText("New Float Amount ($)")).toBeInTheDocument();

		fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

		expect(
			screen.queryByLabelText("New Float Amount ($)"),
		).not.toBeInTheDocument();
	});

	it("dismisses close shift form when Cancel is clicked", async () => {
		render(<Dashboard />);
		await screen.findByText("Active Shift: Alice");

		fireEvent.click(
			screen.getByRole("button", { name: "Close Shift (Blind Count)" }),
		);
		expect(
			screen.getByLabelText("Actual Cash Counted ($)"),
		).toBeInTheDocument();

		const cancelButtons = screen.getAllByRole("button", { name: "Cancel" });
		fireEvent.click(cancelButtons[cancelButtons.length - 1]);

		expect(
			screen.queryByLabelText("Actual Cash Counted ($)"),
		).not.toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Close Shift (Blind Count)" }),
		).toBeInTheDocument();
	});

	it("shows error toast when close shift POST fails", async () => {
		render(<Dashboard />);
		await screen.findByText("Active Shift: Alice");

		fireEvent.click(
			screen.getByRole("button", { name: "Close Shift (Blind Count)" }),
		);
		fireEvent.change(screen.getByLabelText("Actual Cash Counted ($)"), {
			target: { value: "137.50" },
		});

		mockFetch.mockImplementationOnce(() => Promise.reject(new Error("fail")));

		const form = screen
			.getByLabelText("Actual Cash Counted ($)")
			.closest("form");
		fireEvent.submit(form as HTMLFormElement);

		expect(screen.getByText("Confirm Shift Closure")).toBeInTheDocument();
		fireEvent.click(screen.getByRole("button", { name: "Yes, Close Shift" }));

		await waitFor(() => expect(toast.error).toHaveBeenCalled());
	});

	it("calls window.print when Print Safe Slip is clicked", async () => {
		render(<Dashboard />);
		await screen.findByText("Active Shift: Alice");

		fireEvent.click(
			screen.getByRole("button", { name: "Close Shift (Blind Count)" }),
		);
		fireEvent.change(screen.getByLabelText("Actual Cash Counted ($)"), {
			target: { value: "150" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Print Safe Slip" }));

		expect(window.print).toHaveBeenCalled();
	});

	it("aborts shift closure when Cancel is clicked in ConfirmDialog", async () => {
		render(<Dashboard />);
		await screen.findByText("Active Shift: Alice");

		fireEvent.click(
			screen.getByRole("button", { name: "Close Shift (Blind Count)" }),
		);
		fireEvent.change(screen.getByLabelText("Actual Cash Counted ($)"), {
			target: { value: "137.50" },
		});
		const form = screen
			.getByLabelText("Actual Cash Counted ($)")
			.closest("form");
		fireEvent.submit(form as HTMLFormElement);

		expect(screen.getByText("Confirm Shift Closure")).toBeInTheDocument();
		const cancelButtons = screen.getAllByRole("button", { name: "Cancel" });
		// Last cancel button is inside the ConfirmDialog
		fireEvent.click(cancelButtons[cancelButtons.length - 1]);

		expect(screen.queryByText("Confirm Shift Closure")).not.toBeInTheDocument();
		expect(mockFetch).not.toHaveBeenCalledWith(
			expect.stringMatching(/\/close$/),
			expect.anything(),
		);
		expect(screen.getByLabelText("Actual Cash Counted ($)")).toHaveValue(137.5);
	});

	it("renders No Active Shift card and Start Shift button when activeShift is null", async () => {
		vi.mocked(useShift).mockReturnValue({
			activeShift: null,
			loadingShift: false,
			refetchShift: refetchShiftMock,
		});
		render(<Dashboard />);
		expect(await screen.findByText("No Active Shift")).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Start Shift" }),
		).toBeInTheDocument();
	});

	it("opens start shift form and successfully starts a new shift", async () => {
		vi.mocked(useShift).mockReturnValue({
			activeShift: null,
			loadingShift: false,
			refetchShift: refetchShiftMock,
		});
		mockFetch.mockImplementation((url: string) => {
			if (url.includes("/api/shifts") && !url.includes("/close")) {
				return jsonResponse({
					id: "shift-new",
					opening_float: 150,
					status: "OPEN",
				});
			}
			return jsonResponse([]);
		});
		render(<Dashboard />);
		await screen.findByText("No Active Shift");

		fireEvent.click(screen.getByRole("button", { name: "Start Shift" }));
		expect(
			screen.getByLabelText("Opening Float Amount ($)"),
		).toBeInTheDocument();

		fireEvent.change(screen.getByLabelText("Opening Float Amount ($)"), {
			target: { value: "150" },
		});
		fireEvent.click(
			screen.getByRole("button", { name: "Confirm & Start Shift" }),
		);

		await waitFor(() =>
			expect(mockFetch).toHaveBeenCalledWith(
				expect.stringMatching(/\/api\/shifts$/),
				expect.objectContaining({ method: "POST" }),
			),
		);
		await waitFor(() =>
			expect(toast.success).toHaveBeenCalledWith("Shift started successfully!"),
		);
		expect(refetchShiftMock).toHaveBeenCalled();
	});

	it("dismisses start shift form when Cancel is clicked", async () => {
		vi.mocked(useShift).mockReturnValue({
			activeShift: null,
			loadingShift: false,
			refetchShift: refetchShiftMock,
		});
		render(<Dashboard />);
		await screen.findByText("No Active Shift");

		fireEvent.click(screen.getByRole("button", { name: "Start Shift" }));
		expect(
			screen.getByLabelText("Opening Float Amount ($)"),
		).toBeInTheDocument();

		fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
		expect(
			screen.queryByLabelText("Opening Float Amount ($)"),
		).not.toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Start Shift" }),
		).toBeInTheDocument();
	});

	it("shows error toast when start shift POST fails", async () => {
		vi.mocked(useShift).mockReturnValue({
			activeShift: null,
			loadingShift: false,
			refetchShift: refetchShiftMock,
		});
		mockFetch.mockImplementation((url: string) => {
			if (url.includes("/api/shifts")) {
				return jsonResponse({ error: "Failed to create" }, false, 500);
			}
			return jsonResponse([]);
		});
		render(<Dashboard />);
		await screen.findByText("No Active Shift");

		fireEvent.click(screen.getByRole("button", { name: "Start Shift" }));
		fireEvent.change(screen.getByLabelText("Opening Float Amount ($)"), {
			target: { value: "50" },
		});
		fireEvent.click(
			screen.getByRole("button", { name: "Confirm & Start Shift" }),
		);

		await waitFor(() => expect(toast.error).toHaveBeenCalled());
	});

	it("ACP-020: disables Save button during float update submission", async () => {
		let resolvePut: (value: Response) => void;
		const putPromise = new Promise<Response>((resolve) => {
			resolvePut = resolve;
		});

		mockFetch.mockImplementation((_url: string, init?: RequestInit) => {
			if (init?.method === "PUT") {
				return putPromise;
			}
			return Promise.resolve(jsonResponse([]));
		});

		render(<Dashboard />);
		await screen.findByText("Active Shift: Alice");

		fireEvent.click(screen.getByRole("button", { name: "Update Float" }));
		fireEvent.change(screen.getByLabelText("New Float Amount ($)"), {
			target: { value: "150" },
		});
		const form = screen.getByLabelText("New Float Amount ($)").closest("form");
		fireEvent.submit(form as HTMLFormElement);

		expect(screen.getByRole("button", { name: "Saving..." })).toBeDisabled();

		resolvePut?.(jsonResponse({ id: "shift-1", opening_float: 150 }));
		await waitFor(() =>
			expect(toast.success).toHaveBeenCalledWith("Float updated successfully!"),
		);
	});

	it("ACP-024: renders itemized game sales breakdown table with aggregated quantities and subtotals", async () => {
		const multiItemLogs = [
			{
				id: "s1",
				game_id: "g1",
				game_name: "PS5",
				quantity_sold: 2,
				rate_applied: 50,
				calculated_total: 100,
				unit_type: "Hour",
				user_id: "u1",
				date: new Date().toISOString(),
			},
			{
				id: "s2",
				game_id: "g1",
				game_name: "PS5",
				quantity_sold: 1.5,
				rate_applied: 50,
				calculated_total: 75,
				unit_type: "Hour",
				user_id: "u1",
				date: new Date().toISOString(),
			},
			{
				id: "s3",
				game_id: "g2",
				game_name: "8-Ball Pool",
				quantity_sold: 3,
				rate_applied: 20,
				calculated_total: 60,
				unit_type: "Game",
				user_id: "u1",
				date: new Date().toISOString(),
			},
		];

		mockFetch.mockImplementation((url: string) => {
			if (url.includes("/api/sales")) {
				return jsonResponse(multiItemLogs);
			}
			return jsonResponse([]);
		});

		render(<Dashboard />);
		await screen.findByText("Active Shift: Alice");

		expect(screen.getByText("Shift Game Sales by Item")).toBeInTheDocument();

		const itemsTable = screen.getByTestId("shift-game-sales-items");
		expect(within(itemsTable).getByText("PS5")).toBeInTheDocument();
		expect(within(itemsTable).getByText("3.5 hrs")).toBeInTheDocument();
		expect(within(itemsTable).getByText("$175.00")).toBeInTheDocument();

		expect(within(itemsTable).getByText("8-Ball Pool")).toBeInTheDocument();
		expect(within(itemsTable).getByText("3 games")).toBeInTheDocument();
		expect(within(itemsTable).getByText("$60.00")).toBeInTheDocument();

		const kpiCard = screen.getByTestId("kpi-game-sales");
		// ACP-025 (Option B): Top card replaces aggregate currency with direct item pills & distribution bar
		expect(within(kpiCard).getByText("PS5")).toBeInTheDocument();
		expect(within(kpiCard).getByText("3.5 hrs")).toBeInTheDocument();
		expect(within(kpiCard).getByText("$175.00")).toBeInTheDocument();
		expect(within(kpiCard).getByText("8-Ball Pool")).toBeInTheDocument();
		expect(within(kpiCard).getByText("3 games")).toBeInTheDocument();
		expect(within(kpiCard).getByText("$60.00")).toBeInTheDocument();
		expect(
			within(kpiCard).getByTestId("game-sales-distribution-bar"),
		).toBeInTheDocument();
	});

	it("ACP-024 / ACP-025: renders empty state when no game sales exist for the shift", async () => {
		mockFetch.mockImplementation((url: string) => {
			if (url.includes("/api/sales")) {
				return jsonResponse([]);
			}
			return jsonResponse([]);
		});

		render(<Dashboard />);
		await screen.findByText("Active Shift: Alice");

		// Table empty state
		expect(screen.getByText("Shift Game Sales by Item")).toBeInTheDocument();
		expect(
			screen.getByText("No game sales logged for this shift yet."),
		).toBeInTheDocument();

		// ACP-025: Top card empty state badge
		const kpiCard = screen.getByTestId("kpi-game-sales");
		expect(
			within(kpiCard).getByText("No sales logged this shift"),
		).toBeInTheDocument();
	});

	it("ACP-024: renders itemized breakdown in printable Safe Slip (Z-Report)", async () => {
		const slipLogs = [
			{
				id: "s1",
				game_id: "g1",
				game_name: "PS5",
				quantity_sold: 2,
				rate_applied: 50,
				calculated_total: 100,
				unit_type: "Hour",
				user_id: "u1",
				date: new Date().toISOString(),
			},
		];

		mockFetch.mockImplementation((url: string) => {
			if (url.includes("/api/sales")) {
				return jsonResponse(slipLogs);
			}
			return jsonResponse([]);
		});

		render(<Dashboard />);
		await screen.findByText("Active Shift: Alice");

		const safeSlip = document.querySelector(".print\\:block");
		expect(safeSlip).toBeInTheDocument();
		expect(safeSlip).toHaveTextContent("Games Total: $100.00");
		expect(safeSlip).toHaveTextContent("PS5 (2 hrs): $100.00");
	});
});
