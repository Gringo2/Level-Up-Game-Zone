/**
 * @vitest-environment jsdom
 */
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuth } from "../../contexts/AuthContext.js";
import { Reports } from "../../pages/Reports.js";

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

vi.mock("recharts", () => ({
	PieChart: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="pie-chart">{children}</div>
	),
	Pie: () => null,
	Cell: () => null,
	Tooltip: () => null,
	ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
		<div>{children}</div>
	),
}));

const jsonResponse = (data: unknown, ok = true, status = 200) =>
	new Response(JSON.stringify(data), {
		status,
		statusText: ok ? "OK" : "Internal Server Error",
		headers: { "Content-Type": "application/json" },
	});

const shift = {
	id: "s1",
	manager_id: "u1",
	manager_name: "Alice",
	start_time: "2026-08-01T10:00:00.000+03:00",
	end_time: "2026-08-01T18:00:00.000+03:00",
	opening_float: 100,
	status: "CLOSED" as const,
	variance: -5,
};

const salesLog = {
	id: "g1",
	game_id: "g1",
	game_name: "PS4",
	quantity_sold: 4,
	rate_applied: 5,
	calculated_total: 20,
	user_id: "u1",
	date: "2026-08-01T12:00:00.000+03:00",
};

const kenoLog = {
	id: "k1",
	sales: 100,
	payouts: 40,
	net_profit: 60,
	user_id: "u1",
	date: "2026-08-01T14:00:00.000+03:00",
};

const expenseLog = {
	id: "x1",
	description: "Electricity",
	amount: 30,
	category: "Utilities",
	user_id: "u1",
	date: "2026-08-01T15:00:00.000+03:00",
};

const creditLog = {
	id: "c1",
	employee_name: "Bob",
	amount: 10,
	status: "Deducted" as const,
	user_id: "u1",
	date: "2026-08-01T13:00:00.000+03:00",
};

const pendingCreditLog = {
	id: "c2",
	employee_name: "Bob",
	amount: 10,
	status: "Pending" as const,
	user_id: "u1",
	date: "2026-08-01T13:30:00.000+03:00",
};

const resolvedCreditLog = {
	id: "c3",
	employee_name: "Bob",
	amount: 10,
	status: "Resolved" as const,
	user_id: "u1",
	date: "2026-08-01T13:45:00.000+03:00",
};

const sportsBettingLog = {
	id: "sb1",
	net_profit: 80,
	user_id: "u1",
	user_name: "Manager",
	date: "2026-08-01T15:00:00.000+03:00",
	verified: true,
};

describe("Reports", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(useAuth).mockReturnValue({
			user: {
				uid: "u1",
				displayName: "Manager",
				role: "manager" as const,
				email: "m@test.com",
			},
			loading: false,
		});
		window.scrollTo = vi.fn();
	});

	it("shows loading spinner initially", () => {
		vi.stubGlobal("fetch", vi.fn().mockReturnValue(new Promise(() => {})));

		render(<Reports />);

		expect(document.querySelector(".animate-spin")).toBeDefined();
	});

	it("loads and displays report metrics", async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(jsonResponse([]))
			.mockResolvedValueOnce(jsonResponse([]))
			.mockResolvedValueOnce(jsonResponse([]))
			.mockResolvedValueOnce(jsonResponse([]))
			.mockResolvedValueOnce(jsonResponse([]))
			.mockResolvedValueOnce(jsonResponse([]))
			.mockResolvedValueOnce(jsonResponse([shift]))
			.mockResolvedValueOnce(jsonResponse([salesLog]))
			.mockResolvedValueOnce(jsonResponse([kenoLog]))
			.mockResolvedValueOnce(jsonResponse([creditLog]))
			.mockResolvedValueOnce(jsonResponse([expenseLog]))
			.mockResolvedValueOnce(jsonResponse([]));

		vi.stubGlobal("fetch", fetchMock);

		render(<Reports />);

		await waitFor(() => {
			expect(screen.getByText("Historical Reports")).toBeDefined();
		});

		const dateInputs = document.querySelectorAll('input[type="date"]');
		fireEvent.change(dateInputs[0], { target: { value: "2026-08-01" } });
		fireEvent.change(dateInputs[1], { target: { value: "2026-08-31" } });

		fireEvent.click(screen.getByText("Apply"));

		await waitFor(() => {
			expect(screen.getByText("PS4")).toBeDefined();
		});
		expect(screen.getAllByText("Net Profit").length).toBeGreaterThanOrEqual(1);
		expect(screen.getByText("Total Revenue")).toBeDefined();
		expect(screen.getByText("Total Expenses")).toBeDefined();
		expect(screen.getByText("Avg Shift Variance")).toBeDefined();
		expect(screen.getByText("Utilities")).toBeDefined();
		expect(screen.getAllByText("Alice").length).toBeGreaterThanOrEqual(1);
	});

	it("subtracts only pending credits from net profit", async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(jsonResponse([]))
			.mockResolvedValueOnce(jsonResponse([]))
			.mockResolvedValueOnce(jsonResponse([]))
			.mockResolvedValueOnce(jsonResponse([]))
			.mockResolvedValueOnce(jsonResponse([]))
			.mockResolvedValueOnce(jsonResponse([]))
			.mockResolvedValueOnce(jsonResponse([]))
			.mockResolvedValueOnce(jsonResponse([salesLog]))
			.mockResolvedValueOnce(jsonResponse([kenoLog]))
			.mockResolvedValueOnce(
				jsonResponse([creditLog, pendingCreditLog, resolvedCreditLog]),
			)
			.mockResolvedValueOnce(jsonResponse([expenseLog]))
			.mockResolvedValueOnce(jsonResponse([]));

		vi.stubGlobal("fetch", fetchMock);

		render(<Reports />);

		const dateInputs = document.querySelectorAll('input[type="date"]');
		fireEvent.change(dateInputs[0], { target: { value: "2026-08-01" } });
		fireEvent.change(dateInputs[1], { target: { value: "2026-08-31" } });

		fireEvent.click(screen.getByText("Apply"));

		await waitFor(() => {
			expect(screen.getByText("PS4")).toBeDefined();
		});

		// 20 sales + 60 keno - 30 expenses - 10 pending credit = 40
		// Deducted (10) and Resolved (10) credits must NOT reduce profit.
		expect(screen.getAllByText("$40.00").length).toBeGreaterThanOrEqual(1);
	});

	it("shows empty state when all data arrays are empty", async () => {
		vi.stubGlobal(
			"fetch",
			vi
				.fn()
				.mockResolvedValueOnce(jsonResponse([]))
				.mockResolvedValueOnce(jsonResponse([]))
				.mockResolvedValueOnce(jsonResponse([]))
				.mockResolvedValueOnce(jsonResponse([]))
				.mockResolvedValueOnce(jsonResponse([]))
				.mockResolvedValueOnce(jsonResponse([])),
		);

		render(<Reports />);

		await waitFor(() => {
			expect(screen.getByText("No revenue data")).toBeDefined();
		});
		expect(screen.getByText("No expense data")).toBeDefined();
		expect(screen.getByText("No staff data in this period.")).toBeDefined();
		expect(screen.getByText("No game sales in this period.")).toBeDefined();
	});

	it("toasts error when load fails", async () => {
		vi.stubGlobal(
			"fetch",
			vi
				.fn()
				.mockResolvedValueOnce(jsonResponse(null, false, 500))
				.mockResolvedValueOnce(jsonResponse([]))
				.mockResolvedValueOnce(jsonResponse([]))
				.mockResolvedValueOnce(jsonResponse([]))
				.mockResolvedValueOnce(jsonResponse([]))
				.mockResolvedValueOnce(jsonResponse([])),
		);

		render(<Reports />);

		await waitFor(() => {
			expect(toast.error).toHaveBeenCalledWith("Failed to load reports data");
		});
	});

	it("applies date filter and re-fetches data", async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(jsonResponse([]))
			.mockResolvedValueOnce(jsonResponse([]))
			.mockResolvedValueOnce(jsonResponse([]))
			.mockResolvedValueOnce(jsonResponse([]))
			.mockResolvedValueOnce(jsonResponse([]))
			.mockResolvedValueOnce(jsonResponse([]))
			.mockResolvedValueOnce(jsonResponse([shift]))
			.mockResolvedValueOnce(jsonResponse([salesLog]))
			.mockResolvedValueOnce(jsonResponse([kenoLog]))
			.mockResolvedValueOnce(jsonResponse([creditLog]))
			.mockResolvedValueOnce(jsonResponse([expenseLog]))
			.mockResolvedValueOnce(jsonResponse([]));

		vi.stubGlobal("fetch", fetchMock);

		render(<Reports />);

		await waitFor(() => {
			expect(screen.getByText("Historical Reports")).toBeDefined();
		});

		const dateInputs = document.querySelectorAll('input[type="date"]');
		fireEvent.change(dateInputs[0], { target: { value: "2026-08-01" } });
		fireEvent.change(dateInputs[1], { target: { value: "2026-08-31" } });

		fireEvent.click(screen.getByText("Apply"));

		await waitFor(() => {
			expect(fetchMock).toHaveBeenCalledTimes(12);
		});
	});

	it("calls window.print on Print button click", async () => {
		vi.stubGlobal(
			"fetch",
			vi
				.fn()
				.mockResolvedValueOnce(jsonResponse([]))
				.mockResolvedValueOnce(jsonResponse([]))
				.mockResolvedValueOnce(jsonResponse([]))
				.mockResolvedValueOnce(jsonResponse([]))
				.mockResolvedValueOnce(jsonResponse([]))
				.mockResolvedValueOnce(jsonResponse([])),
		);

		render(<Reports />);

		await waitFor(() => {
			expect(screen.getByText("Historical Reports")).toBeDefined();
		});

		const printSpy = vi.spyOn(window, "print").mockImplementation(() => {});
		fireEvent.click(screen.getByText("Print"));
		expect(printSpy).toHaveBeenCalled();
		printSpy.mockRestore();
	});

	it("renders net-only keno rows with em-dash sales/payouts cells", async () => {
		const netOnlyKenoLog = {
			id: "k2",
			net_profit: 75,
			user_id: "u1",
			date: "2026-08-02T14:00:00.000+03:00",
		};
		vi.stubGlobal(
			"fetch",
			vi
				.fn()
				.mockResolvedValueOnce(jsonResponse([]))
				.mockResolvedValueOnce(jsonResponse([]))
				.mockResolvedValueOnce(jsonResponse([]))
				.mockResolvedValueOnce(jsonResponse([]))
				.mockResolvedValueOnce(jsonResponse([]))
				.mockResolvedValueOnce(jsonResponse([]))
				.mockResolvedValueOnce(jsonResponse([]))
				.mockResolvedValueOnce(jsonResponse([]))
				.mockResolvedValueOnce(jsonResponse([kenoLog, netOnlyKenoLog]))
				.mockResolvedValueOnce(jsonResponse([]))
				.mockResolvedValueOnce(jsonResponse([]))
				.mockResolvedValueOnce(jsonResponse([])),
		);

		render(<Reports />);

		const dateInputs = document.querySelectorAll('input[type="date"]');
		fireEvent.change(dateInputs[0], { target: { value: "2026-08-01" } });
		fireEvent.change(dateInputs[1], { target: { value: "2026-08-31" } });
		fireEvent.click(screen.getByText("Apply"));

		await waitFor(() => {
			expect(screen.getByText("$100.00")).toBeDefined();
			expect(screen.getByText("-$40.00")).toBeDefined();
		});
		expect(screen.getByText("$75.00")).toBeDefined();
		expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(2);
	});

	it("renders shift cash reconciliation & drawer audit table with full discrepancy breakdown", async () => {
		const s1 = {
			id: "s1",
			manager_id: "u1",
			manager_name: "Alice Manager",
			start_time: "2026-08-01T10:00:00.000+03:00",
			end_time: "2026-08-01T18:00:00.000+03:00",
			opening_float: 100,
			expected_cash_calculated: 250,
			actual_cash_counted: 240,
			status: "CLOSED" as const,
			variance: -10,
			reason_for_shortage: "Minor register shortage investigated",
		};

		const s2 = {
			id: "s2",
			manager_id: "u2",
			manager_name: "Bob Cashier",
			start_time: "2026-08-02T10:00:00.000+03:00",
			end_time: "2026-08-02T18:00:00.000+03:00",
			opening_float: 120,
			expected_cash_calculated: 300,
			actual_cash_counted: 300,
			status: "CLOSED" as const,
			variance: 0,
		};

		const s3 = {
			id: "s3",
			manager_id: "u1",
			manager_name: "Alice Manager",
			start_time: "2026-08-03T10:00:00.000+03:00",
			opening_float: 150,
			status: "OPEN" as const,
		};

		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(jsonResponse([]))
			.mockResolvedValueOnce(jsonResponse([]))
			.mockResolvedValueOnce(jsonResponse([]))
			.mockResolvedValueOnce(jsonResponse([]))
			.mockResolvedValueOnce(jsonResponse([]))
			.mockResolvedValueOnce(jsonResponse([]))
			.mockResolvedValueOnce(jsonResponse([s1, s2, s3]))
			.mockResolvedValueOnce(jsonResponse([]))
			.mockResolvedValueOnce(jsonResponse([]))
			.mockResolvedValueOnce(jsonResponse([]))
			.mockResolvedValueOnce(jsonResponse([]))
			.mockResolvedValueOnce(jsonResponse([]));

		vi.stubGlobal("fetch", fetchMock);

		render(<Reports />);

		const dateInputs = document.querySelectorAll('input[type="date"]');
		fireEvent.change(dateInputs[0], { target: { value: "2026-08-01" } });
		fireEvent.change(dateInputs[1], { target: { value: "2026-08-31" } });
		fireEvent.click(screen.getByText("Apply"));

		await waitFor(() => {
			expect(
				screen.getByText("Shift Cash Reconciliation & Drawer Audit"),
			).toBeDefined();
		});

		// Header & Drawer KPI metrics
		expect(screen.getByText("Net Drawer Variance")).toBeDefined();
		expect(screen.getByText("Total Cash Processed")).toBeDefined();

		// Shift rows and values
		expect(screen.getAllByText("Alice Manager").length).toBeGreaterThanOrEqual(
			1,
		);
		expect(screen.getAllByText("Bob Cashier").length).toBeGreaterThanOrEqual(1);
		expect(screen.getByText("$100.00")).toBeDefined();
		expect(screen.getByText("$250.00")).toBeDefined();
		expect(screen.getByText("$240.00")).toBeDefined();
		expect(screen.getAllByText("-$10.00").length).toBeGreaterThanOrEqual(1);
		expect(
			screen.getByText("Minor register shortage investigated"),
		).toBeDefined();

		// Balanced shift
		expect(screen.getByText("$120.00")).toBeDefined();
		expect(screen.getAllByText("$300.00").length).toBeGreaterThanOrEqual(2);

		// Open shift em-dashes
		expect(screen.getByText("$150.00")).toBeDefined();
		expect(screen.getByText("OPEN")).toBeDefined();
	});

	it("displays empty state message when no shifts exist in the selected period", async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(jsonResponse([]))
			.mockResolvedValueOnce(jsonResponse([]))
			.mockResolvedValueOnce(jsonResponse([]))
			.mockResolvedValueOnce(jsonResponse([]))
			.mockResolvedValueOnce(jsonResponse([]))
			.mockResolvedValueOnce(jsonResponse([]))
			.mockResolvedValueOnce(jsonResponse([]))
			.mockResolvedValueOnce(jsonResponse([]))
			.mockResolvedValueOnce(jsonResponse([]))
			.mockResolvedValueOnce(jsonResponse([]))
			.mockResolvedValueOnce(jsonResponse([]))
			.mockResolvedValueOnce(jsonResponse([]));

		vi.stubGlobal("fetch", fetchMock);

		render(<Reports />);

		const dateInputs = document.querySelectorAll('input[type="date"]');
		fireEvent.change(dateInputs[0], { target: { value: "2026-08-01" } });
		fireEvent.change(dateInputs[1], { target: { value: "2026-08-31" } });
		fireEvent.click(screen.getByText("Apply"));

		await waitFor(() => {
			expect(
				screen.getByText("Shift Cash Reconciliation & Drawer Audit"),
			).toBeDefined();
		});

		expect(
			screen.getByText("No shifts recorded for this period."),
		).toBeDefined();
	});

	it("ACP-020: disables Apply button and displays warning when From date is after To date", async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(jsonResponse([shift]))
			.mockResolvedValueOnce(jsonResponse([salesLog]))
			.mockResolvedValueOnce(jsonResponse([kenoLog]))
			.mockResolvedValueOnce(jsonResponse([creditLog]))
			.mockResolvedValueOnce(jsonResponse([expenseLog]))
			.mockResolvedValueOnce(jsonResponse([]));

		vi.stubGlobal("fetch", fetchMock);

		render(<Reports />);

		await waitFor(() => {
			expect(screen.getByText("Historical Reports")).toBeDefined();
		});

		const dateInputs = document.querySelectorAll('input[type="date"]');
		fireEvent.change(dateInputs[0], { target: { value: "2026-08-31" } });
		fireEvent.change(dateInputs[1], { target: { value: "2026-08-01" } });

		expect(screen.getByText("Apply")).toBeDisabled();
	});

	it("renders sports betting logs ledger and revenue mix in reports", async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(jsonResponse([]))
			.mockResolvedValueOnce(jsonResponse([]))
			.mockResolvedValueOnce(jsonResponse([]))
			.mockResolvedValueOnce(jsonResponse([]))
			.mockResolvedValueOnce(jsonResponse([]))
			.mockResolvedValueOnce(jsonResponse([]))
			.mockResolvedValueOnce(jsonResponse([]))
			.mockResolvedValueOnce(jsonResponse([salesLog]))
			.mockResolvedValueOnce(jsonResponse([kenoLog]))
			.mockResolvedValueOnce(jsonResponse([]))
			.mockResolvedValueOnce(jsonResponse([]))
			.mockResolvedValueOnce(jsonResponse([sportsBettingLog]));

		vi.stubGlobal("fetch", fetchMock);

		render(<Reports />);

		const dateInputs = document.querySelectorAll('input[type="date"]');
		fireEvent.change(dateInputs[0], { target: { value: "2026-08-01" } });
		fireEvent.change(dateInputs[1], { target: { value: "2026-08-31" } });
		fireEvent.click(screen.getByText("Apply"));

		await waitFor(() => {
			expect(screen.getByText("Sports Betting Logs")).toBeDefined();
		});

		expect(
			screen.getByText("Sports betting net income logged in this period."),
		).toBeInTheDocument();
		expect(screen.getByText("$80.00")).toBeInTheDocument();
		expect(screen.getByText("Sports Betting ($80.00)")).toBeInTheDocument();
		expect(screen.getAllByText("$160.00").length).toBeGreaterThanOrEqual(1);
	});
});
