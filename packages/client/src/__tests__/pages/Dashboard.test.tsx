/**
 * @vitest-environment jsdom
 */
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";
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
			missedData: null,
			refetchShift: refetchShiftMock,
		});
		window.print = vi.fn();
		mockFetch.mockImplementation((url: string) => {
			if (url.endsWith("/api/sales")) {
				return Promise.resolve(jsonResponse(gameSalesLogs));
			}
			if (url.endsWith("/api/keno")) {
				return Promise.resolve(jsonResponse(kenoLogs));
			}
			if (url.endsWith("/api/credits")) {
				return Promise.resolve(jsonResponse(credits));
			}
			if (url.endsWith("/api/expenses")) {
				return Promise.resolve(jsonResponse(expenses));
			}
			if (url.includes("/close") || url.includes("/float")) {
				return Promise.resolve(jsonResponse({ ok: true }));
			}
			return Promise.resolve(jsonResponse({ error: "not found" }, false, 404));
		});
		global.fetch = mockFetch as unknown as typeof fetch;
	});

	it("renders dashboard totals and the active shift card", async () => {
		render(<Dashboard />);
		expect(await screen.findByText("Active Shift: Alice")).toBeInTheDocument();
		expect(screen.getByText("$10.00")).toBeInTheDocument();
		expect(screen.getByText("$60.00")).toBeInTheDocument();
		expect(screen.getByText("-$20.00")).toBeInTheDocument();
		expect(screen.getByText("-$12.50")).toBeInTheDocument();
	});

	it("renders a loader while the shift is loading", async () => {
		vi.mocked(useShift).mockReturnValue({
			activeShift: null,
			loadingShift: true,
			missedData: null,
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
			missedData: null,
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
				return Promise.resolve(jsonResponse({ ok: true }));
			}
			return Promise.resolve(jsonResponse([]));
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
				return Promise.resolve(jsonResponse({ ok: true }));
			}
			return Promise.resolve(jsonResponse([]));
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
			target: { value: "101" },
		});

		mockFetch.mockImplementationOnce(() => Promise.reject(new Error("fail")));

		const form = screen
			.getByLabelText("Actual Cash Counted ($)")
			.closest("form");
		fireEvent.submit(form as HTMLFormElement);

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
});
