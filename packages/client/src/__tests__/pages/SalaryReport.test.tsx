/**
 * @vitest-environment jsdom
 */
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SalaryReport } from "../../pages/SalaryReport.js";

vi.mock("../../firebase", () => ({
	auth: {
		currentUser: { getIdToken: vi.fn().mockResolvedValue("mock-token") },
	},
}));

vi.mock("sonner", () => ({
	toast: { error: vi.fn(), success: vi.fn() },
}));

const jsonResponse = (data: unknown, ok = true, status = 200) =>
	new Response(JSON.stringify(data), {
		status,
		statusText: ok ? "OK" : "Internal Server Error",
		headers: { "Content-Type": "application/json" },
	});

const employee = {
	id: "e1",
	name: "Bob",
	position: "Cashier",
	base_salary: 500,
	hired_date: "2025-01-01",
	break_day: "Monday" as const,
	isActive: true,
	created_at: "",
};

const deductedCredit = {
	id: "c1",
	employee_name: "Bob",
	amount: 20,
	status: "Deducted" as const,
	user_id: "u1",
	date: "2026-08-01T10:00:00.000Z",
};

const pendingCredit = {
	id: "c2",
	employee_name: "Bob",
	amount: 15,
	status: "Pending" as const,
	user_id: "u1",
	date: "2026-08-02T10:00:00.000Z",
};

const unlinkedCredit = {
	id: "c3",
	employee_name: "Former Guy",
	amount: 10,
	status: "Deducted" as const,
	user_id: "u1",
	date: "2026-08-03T10:00:00.000Z",
};

const deletedEmployeeCredit = {
	id: "c4",
	employee_id: "deleted-emp",
	employee_name: "Former Employee",
	amount: 70,
	status: "Deducted" as const,
	user_id: "u1",
	date: "2026-08-04T10:00:00.000Z",
};

describe("SalaryReport", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("shows loading spinner initially", () => {
		vi.stubGlobal("fetch", vi.fn().mockReturnValue(new Promise(() => {})));

		render(<SalaryReport />);

		expect(document.querySelector(".animate-spin")).toBeDefined();
	});

	it("loads and displays employee payroll cards", async () => {
		vi.stubGlobal(
			"fetch",
			vi
				.fn()
				.mockResolvedValueOnce(jsonResponse([deductedCredit, pendingCredit]))
				.mockResolvedValueOnce(jsonResponse([employee])),
		);

		render(<SalaryReport />);

		await waitFor(() => {
			expect(screen.getByText("Bob")).toBeDefined();
		});
		expect(screen.getByText("Cashier")).toBeDefined();
		expect(screen.getByText("Base Salary")).toBeDefined();
		expect(screen.getByText("IOU Deductions")).toBeDefined();
		expect(screen.getByText("Net Payable")).toBeDefined();
		expect(screen.getByText("$500.00")).toBeDefined();
		expect(screen.getAllByText("-$20.00").length).toBeGreaterThanOrEqual(1);
		expect(screen.getByText("$480.00")).toBeDefined();
	});

	it("shows empty state when no active employees or deductions", async () => {
		vi.stubGlobal(
			"fetch",
			vi
				.fn()
				.mockResolvedValueOnce(jsonResponse([]))
				.mockResolvedValueOnce(jsonResponse([])),
		);

		render(<SalaryReport />);

		await waitFor(() => {
			expect(
				screen.getByText(
					"No active employees or salary deductions found in the system.",
				),
			).toBeDefined();
		});
	});

	it("toasts error when load fails", async () => {
		vi.stubGlobal(
			"fetch",
			vi
				.fn()
				.mockResolvedValueOnce(jsonResponse(null, false, 500))
				.mockResolvedValueOnce(jsonResponse([])),
		);

		render(<SalaryReport />);

		await waitFor(() => {
			expect(toast.error).toHaveBeenCalledWith("Failed to load payroll report");
		});
	});

	it("shows deduction history for matched employees", async () => {
		vi.stubGlobal(
			"fetch",
			vi
				.fn()
				.mockResolvedValueOnce(jsonResponse([deductedCredit]))
				.mockResolvedValueOnce(jsonResponse([employee])),
		);

		render(<SalaryReport />);

		await waitFor(() => {
			expect(screen.getByText("Bob")).toBeDefined();
		});
		expect(screen.getByText(/Deduction History/)).toBeDefined();
	});

	it("shows deduction reason in history rows", async () => {
		const deductedWithReason = {
			...deductedCredit,
			id: "cr9",
			reason: "Register shortage",
		};
		vi.stubGlobal(
			"fetch",
			vi
				.fn()
				.mockResolvedValueOnce(jsonResponse([deductedWithReason]))
				.mockResolvedValueOnce(jsonResponse([employee])),
		);

		render(<SalaryReport />);

		await waitFor(() => {
			expect(screen.getByText("Bob")).toBeDefined();
		});
		expect(screen.getByText("Register shortage")).toBeDefined();
	});

	it("calls window.print on Print button click", async () => {
		vi.stubGlobal(
			"fetch",
			vi
				.fn()
				.mockResolvedValueOnce(jsonResponse([]))
				.mockResolvedValueOnce(jsonResponse([])),
		);

		render(<SalaryReport />);

		await waitFor(() => {
			expect(screen.getByText("Payroll & Salary Payout Report")).toBeDefined();
		});

		const printSpy = vi.spyOn(window, "print").mockImplementation(() => {});
		fireEvent.click(screen.getByText("Print"));
		expect(printSpy).toHaveBeenCalled();
		printSpy.mockRestore();
	});

	it("shows unlinked historical credits", async () => {
		vi.stubGlobal(
			"fetch",
			vi
				.fn()
				.mockResolvedValueOnce(jsonResponse([unlinkedCredit]))
				.mockResolvedValueOnce(jsonResponse([employee])),
		);

		render(<SalaryReport />);

		await waitFor(() => {
			expect(screen.getByText("Former Guy")).toBeDefined();
		});
		expect(screen.getByText("Former / Unregistered")).toBeDefined();
		expect(screen.getAllByText("-$10.00").length).toBeGreaterThanOrEqual(1);
	});

	it("shows former employee credits when employee records are missing", async () => {
		vi.stubGlobal(
			"fetch",
			vi
				.fn()
				.mockResolvedValueOnce(jsonResponse([deletedEmployeeCredit]))
				.mockResolvedValueOnce(jsonResponse([employee])),
		);

		render(<SalaryReport />);

		await waitFor(() => {
			expect(screen.getAllByText("Former Employee").length).toBeGreaterThan(0);
		});
		expect(screen.getAllByText("Former Employee").length).toBeGreaterThan(0);
		expect(screen.getAllByText("-$70.00").length).toBeGreaterThanOrEqual(1);
	});

	it("treats employee fetch failures as an empty employee roster", async () => {
		vi.stubGlobal(
			"fetch",
			vi
				.fn()
				.mockResolvedValueOnce(jsonResponse([deductedCredit]))
				.mockResolvedValueOnce(jsonResponse([], false, 500)),
		);

		render(<SalaryReport />);

		await waitFor(() => {
			expect(screen.getByText("Former / Unregistered")).toBeDefined();
		});
		expect(screen.getByText("Bob")).toBeDefined();
		expect(
			screen.getByText(
				"Historical IOUs not linked to an active roster member.",
			),
		).toBeDefined();
	});

	it("does not include Pending credits in deductions", async () => {
		vi.stubGlobal(
			"fetch",
			vi
				.fn()
				.mockResolvedValueOnce(jsonResponse([pendingCredit]))
				.mockResolvedValueOnce(jsonResponse([employee])),
		);

		render(<SalaryReport />);

		await waitFor(() => {
			expect(screen.getByText("Bob")).toBeDefined();
		});
		expect(screen.getByText("No IOUs deducted this period.")).toBeDefined();
	});

	it("ACP-020: disables Apply button when From date is after To date", async () => {
		vi.stubGlobal(
			"fetch",
			vi
				.fn()
				.mockResolvedValueOnce(jsonResponse([deductedCredit]))
				.mockResolvedValueOnce(jsonResponse([employee])),
		);

		render(<SalaryReport />);

		await waitFor(() => {
			expect(screen.getByText("Bob")).toBeDefined();
		});

		const dateInputs = document.querySelectorAll('input[type="date"]');
		fireEvent.change(dateInputs[0], { target: { value: "2026-08-31" } });
		fireEvent.change(dateInputs[1], { target: { value: "2026-08-01" } });

		expect(screen.getByText("Apply")).toBeDisabled();
		expect(
			screen.getByText("From date must be on or before To date"),
		).toBeInTheDocument();
	});

	it("ACP-032: Yesterday and Today preset buttons update input dates and immediately apply", async () => {
		const fetchMock = vi
			.fn()
			.mockImplementation(() => Promise.resolve(jsonResponse([])));
		vi.stubGlobal("fetch", fetchMock);

		render(<SalaryReport />);
		await waitFor(() => {
			expect(
				screen.getByRole("button", { name: "Yesterday" }),
			).toBeInTheDocument();
		});

		const yesterdayBtn = screen.getByRole("button", { name: "Yesterday" });
		const todayBtn = screen.getByRole("button", { name: "Today" });
		expect(yesterdayBtn).toBeInTheDocument();
		expect(todayBtn).toBeInTheDocument();

		// Click Yesterday - immediate re-fetch without clicking Apply
		fetchMock.mockClear();
		fireEvent.click(yesterdayBtn);

		await waitFor(() => {
			expect(fetchMock).toHaveBeenCalled();
		});

		// Subtitle updates to contextually describe yesterday
		expect(
			screen.getByText(
				"Yesterday's net salary calculations and itemized IOU deductions for store staff.",
			),
		).toBeInTheDocument();

		// Click Today - immediate re-fetch
		fetchMock.mockClear();
		fireEvent.click(todayBtn);

		await waitFor(() => {
			expect(fetchMock).toHaveBeenCalled();
		});
		expect(
			screen.getByText(
				"Today's net salary calculations and itemized IOU deductions for store staff.",
			),
		).toBeInTheDocument();
	});

	it("ACP-034: This Month, Last Month, and This Week preset buttons update input dates, trigger fetch, and update subtitle", async () => {
		const fetchMock = vi
			.fn()
			.mockImplementation(() => Promise.resolve(jsonResponse([])));
		vi.stubGlobal("fetch", fetchMock);

		render(<SalaryReport />);
		await waitFor(() => {
			expect(
				screen.getByRole("button", { name: "This Month" }),
			).toBeInTheDocument();
		});

		const thisMonthBtn = screen.getByRole("button", { name: "This Month" });
		const lastMonthBtn = screen.getByRole("button", { name: "Last Month" });
		const thisWeekBtn = screen.getByRole("button", { name: "This Week" });

		expect(thisMonthBtn).toBeInTheDocument();
		expect(lastMonthBtn).toBeInTheDocument();
		expect(thisWeekBtn).toBeInTheDocument();

		// Click This Month
		fetchMock.mockClear();
		fireEvent.click(thisMonthBtn);
		await waitFor(() => {
			expect(fetchMock).toHaveBeenCalled();
		});
		expect(
			screen.getByText(
				"This month's net salary calculations and itemized IOU deductions for store staff.",
			),
		).toBeInTheDocument();

		// Click Last Month
		fetchMock.mockClear();
		fireEvent.click(lastMonthBtn);
		await waitFor(() => {
			expect(fetchMock).toHaveBeenCalled();
		});
		expect(
			screen.getByText(
				"Last month's net salary calculations and itemized IOU deductions for store staff.",
			),
		).toBeInTheDocument();

		// Click This Week
		fetchMock.mockClear();
		fireEvent.click(thisWeekBtn);
		await waitFor(() => {
			expect(fetchMock).toHaveBeenCalled();
		});
		expect(
			screen.getByText(
				"This week's net salary calculations and itemized IOU deductions for store staff.",
			),
		).toBeInTheDocument();
	});

	it("ACP-037: preset buttons dynamically highlight active state across all 5 period presets and deselect on custom range", async () => {
		const fetchMock = vi
			.fn()
			.mockImplementation(() => Promise.resolve(jsonResponse([])));
		vi.stubGlobal("fetch", fetchMock);

		render(<SalaryReport />);
		await waitFor(() => {
			expect(
				screen.getByRole("button", { name: "This Month" }),
			).toBeInTheDocument();
		});

		const thisMonthBtn = screen.getByRole("button", { name: "This Month" });
		const lastMonthBtn = screen.getByRole("button", { name: "Last Month" });
		const thisWeekBtn = screen.getByRole("button", { name: "This Week" });
		const todayBtn = screen.getByRole("button", { name: "Today" });
		const yesterdayBtn = screen.getByRole("button", { name: "Yesterday" });

		// Default state is Today active
		expect(todayBtn).toHaveClass("bg-zinc-900");
		expect(yesterdayBtn).toHaveClass("border-zinc-200");
		expect(thisMonthBtn).toHaveClass("border-zinc-200");
		expect(lastMonthBtn).toHaveClass("border-zinc-200");
		expect(thisWeekBtn).toHaveClass("border-zinc-200");

		// Click This Month
		fireEvent.click(thisMonthBtn);
		expect(thisMonthBtn).toHaveClass("bg-zinc-900");
		expect(todayBtn).toHaveClass("border-zinc-200");
		expect(yesterdayBtn).toHaveClass("border-zinc-200");
		expect(lastMonthBtn).toHaveClass("border-zinc-200");
		expect(thisWeekBtn).toHaveClass("border-zinc-200");

		// Click Last Month
		fireEvent.click(lastMonthBtn);
		expect(lastMonthBtn).toHaveClass("bg-zinc-900");
		expect(thisMonthBtn).toHaveClass("border-zinc-200");
		expect(todayBtn).toHaveClass("border-zinc-200");
		expect(yesterdayBtn).toHaveClass("border-zinc-200");
		expect(thisWeekBtn).toHaveClass("border-zinc-200");

		// Click This Week
		fireEvent.click(thisWeekBtn);
		expect(thisWeekBtn).toHaveClass("bg-zinc-900");
		expect(thisMonthBtn).toHaveClass("border-zinc-200");
		expect(lastMonthBtn).toHaveClass("border-zinc-200");
		expect(todayBtn).toHaveClass("border-zinc-200");
		expect(yesterdayBtn).toHaveClass("border-zinc-200");

		// Click Yesterday
		fireEvent.click(yesterdayBtn);
		expect(yesterdayBtn).toHaveClass("bg-zinc-900");
		expect(todayBtn).toHaveClass("border-zinc-200");
		expect(thisMonthBtn).toHaveClass("border-zinc-200");
		expect(lastMonthBtn).toHaveClass("border-zinc-200");
		expect(thisWeekBtn).toHaveClass("border-zinc-200");

		// Change date input to custom range
		const dateInputs = document.querySelectorAll('input[type="date"]');
		const toInput = dateInputs[1] as HTMLInputElement;
		fireEvent.change(toInput, { target: { value: "2099-01-01" } });
		expect(todayBtn).toHaveClass("border-zinc-200");
		expect(todayBtn).not.toHaveClass("bg-zinc-900");
		expect(yesterdayBtn).toHaveClass("border-zinc-200");
		expect(yesterdayBtn).not.toHaveClass("bg-zinc-900");
		expect(thisMonthBtn).toHaveClass("border-zinc-200");
		expect(thisMonthBtn).not.toHaveClass("bg-zinc-900");
		expect(lastMonthBtn).toHaveClass("border-zinc-200");
		expect(lastMonthBtn).not.toHaveClass("bg-zinc-900");
		expect(thisWeekBtn).toHaveClass("border-zinc-200");
		expect(thisWeekBtn).not.toHaveClass("bg-zinc-900");
	});
});
