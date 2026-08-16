/**
 * @vitest-environment jsdom
 */
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuth } from "../../contexts/AuthContext.js";
import { Credits } from "../../pages/Credits.js";

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

const credit = {
	id: "c1",
	employee_name: "Bob",
	amount: 20,
	status: "Pending" as const,
	user_id: "u1",
	date: new Date().toISOString(),
};

const credit2 = {
	id: "c2",
	employee_name: "Alice",
	amount: 10,
	status: "Resolved" as const,
	user_id: "u1",
	date: new Date().toISOString(),
};

const employees = [
	{
		id: "e1",
		name: "Bob",
		position: "Cashier",
		base_salary: 500,
		hired_date: "2025-01-01",
		break_day: null,
		isActive: true,
		created_at: "",
	},
];

describe("Credits", () => {
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

	it("loads and displays credits", async () => {
		vi.stubGlobal(
			"fetch",
			vi
				.fn()
				.mockResolvedValueOnce(jsonResponse([credit, credit2]))
				.mockResolvedValueOnce(jsonResponse(employees)),
		);

		render(<Credits />);

		await waitFor(() => {
			expect(screen.getByText("Bob")).toBeDefined();
		});
		expect(screen.getByText("Alice")).toBeDefined();
		expect(screen.getByText("$20.00")).toBeDefined();
		expect(screen.getByText("$10.00")).toBeDefined();
	});

	it("shows empty state when no credits", async () => {
		vi.stubGlobal(
			"fetch",
			vi
				.fn()
				.mockResolvedValueOnce(jsonResponse([]))
				.mockResolvedValueOnce(jsonResponse(employees)),
		);

		render(<Credits />);

		await waitFor(() => {
			expect(screen.getByText("No credits logged yet.")).toBeDefined();
		});
	});

	it("toasts error when load fails", async () => {
		vi.stubGlobal(
			"fetch",
			vi
				.fn()
				.mockResolvedValueOnce(jsonResponse(null, false, 500))
				.mockResolvedValueOnce(jsonResponse(employees)),
		);

		render(<Credits />);

		await waitFor(() => {
			expect(toast.error).toHaveBeenCalledWith("Failed to load credits");
		});
	});

	it("logs a new credit via POST", async () => {
		const newCredit = {
			id: "c3",
			employee_name: "Bob",
			amount: 15,
			status: "Pending" as const,
			user_id: "u1",
			date: new Date().toISOString(),
		};

		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(jsonResponse([credit]))
			.mockResolvedValueOnce(jsonResponse(employees))
			.mockResolvedValueOnce(jsonResponse(newCredit));

		vi.stubGlobal("fetch", fetchMock);

		render(<Credits />);

		await waitFor(() => {
			expect(screen.getByText("Bob (Cashier)")).toBeDefined();
		});

		fireEvent.change(screen.getByLabelText("Employee Name"), {
			target: { value: "Bob" },
		});
		fireEvent.change(screen.getByLabelText("Amount ($)"), {
			target: { value: "15" },
		});

		fireEvent.click(screen.getByText("Log Credit"));

		await waitFor(() => {
			expect(fetchMock).toHaveBeenCalledWith(
				expect.stringContaining("/api/credits"),
				expect.objectContaining({ method: "POST" }),
			);
		});
		expect(toast.success).toHaveBeenCalledWith("Credit logged successfully!");
	});

	it("marks credit as Resolved via PUT", async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(jsonResponse([credit]))
			.mockResolvedValueOnce(jsonResponse(employees))
			.mockResolvedValueOnce(jsonResponse({ ...credit, status: "Resolved" }));

		vi.stubGlobal("fetch", fetchMock);

		render(<Credits />);

		await waitFor(() => {
			expect(screen.getByText("Bob")).toBeDefined();
		});

		fireEvent.click(screen.getByText("Mark Paid"));

		await waitFor(() => {
			expect(fetchMock).toHaveBeenCalledWith(
				expect.stringContaining("/api/credits/c1"),
				expect.objectContaining({ method: "PUT" }),
			);
		});
		expect(toast.success).toHaveBeenCalledWith("Credit marked as Resolved");
	});

	it("marks credit as Deducted via PUT", async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(jsonResponse([credit]))
			.mockResolvedValueOnce(jsonResponse(employees))
			.mockResolvedValueOnce(jsonResponse({ ...credit, status: "Deducted" }));

		vi.stubGlobal("fetch", fetchMock);

		render(<Credits />);

		await waitFor(() => {
			expect(screen.getByText("Bob")).toBeDefined();
		});

		fireEvent.click(screen.getByText("Deduct"));

		await waitFor(() => {
			expect(fetchMock).toHaveBeenCalledWith(
				expect.stringContaining("/api/credits/c1"),
				expect.objectContaining({ method: "PUT" }),
			);
		});
		expect(toast.success).toHaveBeenCalledWith("Credit marked as Deducted");
	});

	it("deletes a credit with reason via DELETE", async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(jsonResponse([credit]))
			.mockResolvedValueOnce(jsonResponse(employees))
			.mockResolvedValueOnce(jsonResponse({ ok: true }));

		vi.stubGlobal("fetch", fetchMock);

		render(<Credits />);

		await waitFor(() => {
			expect(screen.getByText("Bob")).toBeDefined();
		});

		const trashButtons = screen
			.getAllByRole("button")
			.filter((btn) =>
				btn.querySelector("svg")?.classList.contains("lucide-trash2"),
			);
		fireEvent.click(trashButtons[0]);

		const reasonInput = screen.getByPlaceholderText("Reason...");
		fireEvent.change(reasonInput, { target: { value: "Duplicate entry" } });

		fireEvent.click(screen.getByText("Yes"));

		await waitFor(() => {
			expect(fetchMock).toHaveBeenCalledWith(
				expect.stringContaining("/api/credits/c1"),
				expect.objectContaining({ method: "DELETE" }),
			);
		});
		expect(toast.success).toHaveBeenCalledWith("Credit deleted successfully!");
	});

	it("shows text input when employee roster is empty", async () => {
		vi.stubGlobal(
			"fetch",
			vi
				.fn()
				.mockResolvedValueOnce(jsonResponse([]))
				.mockResolvedValueOnce(jsonResponse([])),
		);

		render(<Credits />);

		await waitFor(() => {
			expect(
				screen.getByPlaceholderText("Type employee name..."),
			).toBeDefined();
		});
	});

	it("shows select when employee roster has employees", async () => {
		vi.stubGlobal(
			"fetch",
			vi
				.fn()
				.mockResolvedValueOnce(jsonResponse([]))
				.mockResolvedValueOnce(jsonResponse(employees)),
		);

		render(<Credits />);

		await waitFor(() => {
			expect(screen.getByText("Bob (Cashier)")).toBeDefined();
		});
	});

	it("requires delete reason before confirming", async () => {
		vi.stubGlobal(
			"fetch",
			vi
				.fn()
				.mockResolvedValueOnce(jsonResponse([credit]))
				.mockResolvedValueOnce(jsonResponse(employees)),
		);

		render(<Credits />);

		await waitFor(() => {
			expect(screen.getByText("Bob")).toBeDefined();
		});

		const trashButtons = screen
			.getAllByRole("button")
			.filter((btn) =>
				btn.querySelector("svg")?.classList.contains("lucide-trash2"),
			);
		fireEvent.click(trashButtons[0]);

		expect(screen.getByText("Yes")).toBeDefined();

		fireEvent.click(screen.getByText("No"));
		await waitFor(() => {
			expect(screen.queryByPlaceholderText("Reason...")).toBeNull();
		});
	});
});
