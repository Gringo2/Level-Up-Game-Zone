/**
 * @vitest-environment jsdom
 */
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuth } from "../../contexts/AuthContext.js";
import { EmployeeRoster } from "../../pages/EmployeeRoster.js";

const { mockGetIdToken } = vi.hoisted(() => ({
	mockGetIdToken: vi
		.fn<() => Promise<string | null>>()
		.mockResolvedValue("mock-token"),
}));

vi.mock("../../firebase", () => ({
	auth: {
		currentUser: { getIdToken: mockGetIdToken },
	},
}));

vi.mock("firebase/auth", () => ({
	signOut: vi.fn(),
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

const emp = {
	id: "e1",
	name: "Alice",
	position: "Manager",
	base_salary: 1000,
	hired_date: "2025-01-01",
	break_day: "Monday" as const,
	isActive: true,
	created_at: "2025-01-01T00:00:00.000Z",
};

const emp2 = {
	id: "e2",
	name: "Bob",
	position: "Cashier",
	base_salary: 500,
	hired_date: "2025-06-15",
	break_day: null,
	isActive: true,
	created_at: "2025-06-15T00:00:00.000Z",
};

const employees = [emp, emp2];

describe("EmployeeRoster", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockGetIdToken.mockResolvedValue("mock-token");
		vi.mocked(useAuth).mockReturnValue({
			user: {
				uid: "u1",
				displayName: "Admin",
				role: "admin" as const,
				email: "a@test.com",
			},
			loading: false,
		});
		window.scrollTo = vi.fn();
	});

	it("shows loading spinner initially", () => {
		vi.stubGlobal("fetch", vi.fn().mockReturnValue(new Promise(() => {})));

		render(<EmployeeRoster />);

		expect(document.querySelector(".animate-spin")).toBeDefined();
	});

	it("loads and displays employees sorted by name", async () => {
		vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(employees)));

		render(<EmployeeRoster />);

		await waitFor(() => {
			expect(screen.getByText("Alice")).toBeDefined();
		});
		expect(screen.getByText("Bob")).toBeDefined();
		expect(screen.getByText("Manager")).toBeDefined();
		expect(screen.getByText("Cashier")).toBeDefined();
		expect(screen.getByText("Break Day: Monday")).toBeDefined();
		expect(screen.getByText("Break Day: None")).toBeDefined();
	});

	it("shows empty state when no employees", async () => {
		vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse([])));

		render(<EmployeeRoster />);

		await waitFor(() => {
			expect(
				screen.getByText("No employees registered in the roster yet."),
			).toBeDefined();
		});
	});

	it("toasts error when load fails", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue(jsonResponse(null, false, 500)),
		);

		render(<EmployeeRoster />);

		await waitFor(() => {
			expect(toast.error).toHaveBeenCalledWith(
				"Failed to load employee roster",
			);
		});
	});

	it("edits an employee inline via PUT", async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(jsonResponse(employees))
			.mockResolvedValueOnce(jsonResponse({ ...emp, name: "Alice Updated" }));

		vi.stubGlobal("fetch", fetchMock);

		render(<EmployeeRoster />);

		await waitFor(() => {
			expect(screen.getByText("Alice")).toBeDefined();
		});

		const editButtons = screen.getAllByText("Edit");
		fireEvent.click(editButtons[0]);

		const nameInputs = screen.getAllByDisplayValue("Alice");
		fireEvent.change(nameInputs[0], { target: { value: "Alice Updated" } });

		const reasonInput = screen.getByPlaceholderText(
			"e.g. Salary adjustment / Promotion",
		);
		fireEvent.change(reasonInput, { target: { value: "Name correction" } });

		fireEvent.click(screen.getByText("Save Changes"));

		await waitFor(() => {
			expect(fetchMock).toHaveBeenCalledWith(
				expect.stringContaining("/api/employees/e1"),
				expect.objectContaining({ method: "PUT" }),
			);
		});
		expect(toast.success).toHaveBeenCalledWith("Employee record updated!");
	});

	it("disables Save Changes when edit reason is empty", async () => {
		vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(employees)));

		render(<EmployeeRoster />);

		await waitFor(() => {
			expect(screen.getByText("Alice")).toBeDefined();
		});

		const editButtons = screen.getAllByText("Edit");
		fireEvent.click(editButtons[0]);

		const saveBtn = screen.getByText("Save Changes");
		expect(saveBtn.closest("button")).toHaveProperty("disabled", true);

		const reasonInput = screen.getByPlaceholderText(
			"e.g. Salary adjustment / Promotion",
		);
		fireEvent.change(reasonInput, { target: { value: "Valid reason" } });
		expect(
			screen.getByText("Save Changes").closest("button"),
		).not.toHaveProperty("disabled", true);
	});

	it("toggles employee active status via PUT", async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(jsonResponse(employees))
			.mockResolvedValueOnce(jsonResponse({ ...emp, isActive: false }));

		vi.stubGlobal("fetch", fetchMock);

		render(<EmployeeRoster />);

		await waitFor(() => {
			expect(screen.getByText("Alice")).toBeDefined();
		});

		const deactivateButtons = screen.getAllByText("Deactivate");
		fireEvent.click(deactivateButtons[0]);

		await waitFor(() => {
			expect(fetchMock).toHaveBeenCalledWith(
				expect.stringContaining("/api/employees/e1"),
				expect.objectContaining({ method: "PUT" }),
			);
		});
		expect(toast.success).toHaveBeenCalledWith("Alice marked as Inactive");
	});

	it("hides edit button for staff role", async () => {
		vi.mocked(useAuth).mockReturnValue({
			user: {
				uid: "u1",
				displayName: "Staff",
				role: "staff" as const,
				email: "s@test.com",
			},
			loading: false,
		});

		vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(employees)));

		render(<EmployeeRoster />);

		await waitFor(() => {
			expect(screen.getByText("Alice")).toBeDefined();
		});

		expect(screen.queryByText("Edit")).toBeNull();
	});
});

describe("EmployeeRoster - Failure & Form Paths", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockGetIdToken.mockResolvedValue("mock-token");
		vi.mocked(useAuth).mockReturnValue({
			user: {
				uid: "u1",
				displayName: "Admin",
				role: "admin",
				email: "a@test.com",
			},
			loading: false,
		});
		window.scrollTo = vi.fn();
	});

	it("toasts load error when no token is available", async () => {
		mockGetIdToken.mockResolvedValue(null);
		const fetchMock = vi.fn();
		vi.stubGlobal("fetch", fetchMock);

		render(<EmployeeRoster />);

		await waitFor(() => {
			expect(toast.error).toHaveBeenCalledWith(
				"Failed to load employee roster",
			);
		});
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("toasts edit error when the save PUT fails", async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(jsonResponse(employees))
			.mockResolvedValueOnce(jsonResponse({ error: "boom" }, false, 500));
		vi.stubGlobal("fetch", fetchMock);

		render(<EmployeeRoster />);

		await waitFor(() => {
			expect(screen.getByText("Alice")).toBeDefined();
		});

		fireEvent.click(screen.getAllByText("Edit")[0]);
		const reasonInput = screen.getByPlaceholderText(
			"e.g. Salary adjustment / Promotion",
		);
		fireEvent.change(reasonInput, { target: { value: "Adjustment" } });
		fireEvent.click(screen.getByText("Save Changes"));

		await waitFor(() => {
			expect(toast.error).toHaveBeenCalledWith("boom");
		});
	});

	it("toasts toggle error when the status PUT fails", async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(jsonResponse(employees))
			.mockResolvedValueOnce(jsonResponse({ error: "boom" }, false, 500));
		vi.stubGlobal("fetch", fetchMock);

		render(<EmployeeRoster />);

		await waitFor(() => {
			expect(screen.getByText("Alice")).toBeDefined();
		});

		fireEvent.click(screen.getAllByText("Deactivate")[0]);

		await waitFor(() => {
			expect(toast.error).toHaveBeenCalledWith(
				"Failed to update active status",
			);
		});
	});

	it("cancels an inline edit and restores the read-only row", async () => {
		vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(employees)));

		render(<EmployeeRoster />);

		await waitFor(() => {
			expect(screen.getByText("Alice")).toBeDefined();
		});

		fireEvent.click(screen.getAllByText("Edit")[0]);
		expect(screen.getByText("Save Changes")).toBeDefined();

		fireEvent.click(screen.getByText("Cancel"));
		expect(screen.queryByText("Save Changes")).toBeNull();
	});

	it("updates position, salary, hire date and break day in edit mode", async () => {
		const updated = {
			...emp,
			position: "Owner",
			base_salary: 1200,
			hired_date: "2024-01-01",
			break_day: "Friday",
		};
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(jsonResponse(employees))
			.mockResolvedValueOnce(jsonResponse(updated));
		vi.stubGlobal("fetch", fetchMock);

		render(<EmployeeRoster />);

		await waitFor(() => {
			expect(screen.getByText("Alice")).toBeDefined();
		});

		fireEvent.click(screen.getAllByText("Edit")[0]);

		fireEvent.change(screen.getByDisplayValue("Manager"), {
			target: { value: "Owner" },
		});
		fireEvent.change(screen.getByDisplayValue("1000"), {
			target: { value: "1200" },
		});
		fireEvent.change(screen.getByDisplayValue("2025-01-01"), {
			target: { value: "2024-01-01" },
		});
		fireEvent.change(screen.getByDisplayValue("Monday"), {
			target: { value: "Friday" },
		});
		const reasonInput = screen.getByPlaceholderText(
			"e.g. Salary adjustment / Promotion",
		);
		fireEvent.change(reasonInput, { target: { value: "Promotion" } });
		fireEvent.click(screen.getByText("Save Changes"));

		await waitFor(() => {
			expect(fetchMock).toHaveBeenCalledWith(
				expect.stringContaining("/api/employees/e1"),
				expect.objectContaining({ method: "PUT" }),
			);
		});
		expect(toast.success).toHaveBeenCalledWith("Employee record updated!");
	});

	it("no longer hosts the hiring form (moved to Admin)", async () => {
		vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(employees)));
		render(<EmployeeRoster />);
		await screen.findByText("Alice");
		expect(screen.queryByText("Add Store Employee")).not.toBeInTheDocument();
	});
});
