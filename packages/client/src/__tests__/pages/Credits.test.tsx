/**
 * @vitest-environment jsdom
 */
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuth } from "../../contexts/AuthContext.js";
import { Credits } from "../../pages/Credits.js";

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
	employee_id: "e1",
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
		mockGetIdToken.mockResolvedValue("mock-token");
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
			target: { value: "e1" },
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

		const reasonInput = screen.getByPlaceholderText("Reason for deletion...");
		fireEvent.change(reasonInput, { target: { value: "Duplicate entry" } });

		fireEvent.click(screen.getByText("Confirm Delete"));

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
				screen.getByText("Employee roster empty. Please add employees first."),
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

		expect(screen.getByText("Confirm Delete")).toBeDefined();

		fireEvent.click(screen.getByText("Cancel"));
		await waitFor(() => {
			expect(screen.queryByPlaceholderText("Reason...")).toBeNull();
		});
	});
});

describe("Credits - Edit & Failure Paths", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockGetIdToken.mockResolvedValue("mock-token");
		vi.mocked(useAuth).mockReturnValue({
			user: {
				uid: "u1",
				displayName: "Manager",
				role: "manager",
				email: "m@test.com",
			},
			loading: false,
		});
		window.scrollTo = vi.fn();
	});

	const findIconButton = (iconClass: string) =>
		screen
			.getAllByRole("button")
			.filter((btn) => btn.querySelector("svg")?.classList.contains(iconClass));

	const editButton = () => findIconButton("lucide-pen")[0];

	it("edits a credit inline and updates it via PUT", async () => {
		const updated = { ...credit, amount: 25 };
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(jsonResponse([credit]))
			.mockResolvedValueOnce(jsonResponse(employees))
			.mockResolvedValueOnce(jsonResponse(updated));

		vi.stubGlobal("fetch", fetchMock);

		render(<Credits />);

		await waitFor(() => {
			expect(screen.getByText("Bob")).toBeDefined();
		});

		fireEvent.click(editButton());

		fireEvent.change(screen.getByLabelText("Amount ($)"), {
			target: { value: "25" },
		});
		fireEvent.change(screen.getByLabelText("Reason for Edit (Required)"), {
			target: { value: "Correct amount" },
		});

		fireEvent.click(screen.getByText("Update Credit"));

		await waitFor(() => {
			expect(fetchMock).toHaveBeenCalledWith(
				expect.stringContaining("/api/credits/c1"),
				expect.objectContaining({ method: "PUT" }),
			);
		});
		expect(toast.success).toHaveBeenCalledWith("Credit updated successfully!");
		expect(screen.getByText("$25.00")).toBeDefined();
	});

	it("cancels an edit and resets the form", async () => {
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

		fireEvent.click(editButton());
		expect(screen.getByText("Update Credit")).toBeDefined();

		fireEvent.click(screen.getByText("Cancel"));
		expect(screen.queryByText("Update Credit")).toBeNull();
		expect(screen.getByText("Log Credit")).toBeDefined();
	});

	it("toasts save error when the edit PUT fails", async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(jsonResponse([credit]))
			.mockResolvedValueOnce(jsonResponse(employees))
			.mockResolvedValueOnce(jsonResponse({ error: "boom" }, false, 500));

		vi.stubGlobal("fetch", fetchMock);

		render(<Credits />);

		await waitFor(() => {
			expect(screen.getByText("Bob")).toBeDefined();
		});

		fireEvent.click(editButton());
		fireEvent.change(screen.getByLabelText("Amount ($)"), {
			target: { value: "25" },
		});
		fireEvent.change(screen.getByLabelText("Reason for Edit (Required)"), {
			target: { value: "Correct amount" },
		});
		fireEvent.click(screen.getByText("Update Credit"));

		await waitFor(() => {
			expect(toast.error).toHaveBeenCalledWith("Failed to save credit");
		});
	});

	it("toasts resolve error when the status PUT fails", async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(jsonResponse([credit]))
			.mockResolvedValueOnce(jsonResponse(employees))
			.mockResolvedValueOnce(jsonResponse({ error: "boom" }, false, 500));

		vi.stubGlobal("fetch", fetchMock);

		render(<Credits />);

		await waitFor(() => {
			expect(screen.getByText("Bob")).toBeDefined();
		});

		fireEvent.click(screen.getByText("Mark Paid"));

		await waitFor(() => {
			expect(toast.error).toHaveBeenCalledWith(
				"Failed to mark credit as Resolved",
			);
		});
	});

	it("toasts delete error when the DELETE fails", async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(jsonResponse([credit]))
			.mockResolvedValueOnce(jsonResponse(employees))
			.mockResolvedValueOnce(jsonResponse({ error: "boom" }, false, 500));

		vi.stubGlobal("fetch", fetchMock);

		render(<Credits />);

		await waitFor(() => {
			expect(screen.getByText("Bob")).toBeDefined();
		});

		fireEvent.click(findIconButton("lucide-trash2")[0]);
		fireEvent.change(screen.getByPlaceholderText("Reason for deletion..."), {
			target: { value: "Duplicate entry" },
		});
		fireEvent.click(screen.getByText("Confirm Delete"));

		await waitFor(() => {
			expect(toast.error).toHaveBeenCalledWith("Failed to delete credit");
		});
	});

	it("toasts save error when the POST fails", async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(jsonResponse([credit]))
			.mockResolvedValueOnce(jsonResponse(employees))
			.mockResolvedValueOnce(jsonResponse({ error: "boom" }, false, 500));

		vi.stubGlobal("fetch", fetchMock);

		render(<Credits />);

		await waitFor(() => {
			expect(screen.getByText("Bob (Cashier)")).toBeDefined();
		});

		fireEvent.change(screen.getByLabelText("Employee Name"), {
			target: { value: "e1" },
		});
		fireEvent.change(screen.getByLabelText("Amount ($)"), {
			target: { value: "15" },
		});
		fireEvent.click(screen.getByText("Log Credit"));

		await waitFor(() => {
			expect(toast.error).toHaveBeenCalledWith("Failed to save credit");
		});
	});

	it("toasts load error when no token is available", async () => {
		mockGetIdToken.mockResolvedValue(null);
		const fetchMock = vi.fn();
		vi.stubGlobal("fetch", fetchMock);

		render(<Credits />);

		await waitFor(() => {
			expect(toast.error).toHaveBeenCalledWith("Failed to load credits");
		});
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("shows empty roster message when roster is empty", async () => {
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
				screen.getByText("Employee roster empty. Please add employees first."),
			).toBeDefined();
		});
	});

	it("does not submit when no user is signed in", async () => {
		vi.mocked(useAuth).mockReturnValue({ user: null, loading: false });
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(jsonResponse([]))
			.mockResolvedValueOnce(jsonResponse([]));
		vi.stubGlobal("fetch", fetchMock);

		render(<Credits />);

		await waitFor(() => {
			expect(fetchMock).toHaveBeenCalledTimes(2);
		});
		expect(screen.getByText("No credits logged yet.")).toBeDefined();
		expect(
			screen.getByText("Employee roster empty. Please add employees first."),
		).toBeDefined();

		expect(fetchMock).toHaveBeenCalledTimes(2);
	});
});
