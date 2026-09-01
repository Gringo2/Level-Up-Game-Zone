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
});
