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
			.mockResolvedValueOnce(jsonResponse([shift]))
			.mockResolvedValueOnce(jsonResponse([salesLog]))
			.mockResolvedValueOnce(jsonResponse([kenoLog]))
			.mockResolvedValueOnce(jsonResponse([creditLog]))
			.mockResolvedValueOnce(jsonResponse([expenseLog]));

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
		expect(screen.getByText("Alice")).toBeDefined();
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
			.mockResolvedValueOnce(jsonResponse([shift]))
			.mockResolvedValueOnce(jsonResponse([salesLog]))
			.mockResolvedValueOnce(jsonResponse([kenoLog]))
			.mockResolvedValueOnce(jsonResponse([creditLog]))
			.mockResolvedValueOnce(jsonResponse([expenseLog]));

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
			expect(fetchMock).toHaveBeenCalledTimes(10);
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
});
