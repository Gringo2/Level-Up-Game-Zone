/**
 * @vitest-environment jsdom
 */
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MissedShiftsCard } from "../../components/MissedShiftsCard.js";

// M-133 / TD-066: a forgotten shift can be closed from the Dashboard.
vi.mock("../../firebase", () => ({
	auth: {
		currentUser: { getIdToken: vi.fn().mockResolvedValue("mock-token") },
	},
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

const jsonResponse = (data: unknown, status = 200) =>
	new Response(JSON.stringify(data), {
		status,
		headers: { "Content-Type": "application/json" },
	});
const mockFetch = vi.fn();

const missed = [
	{
		id: "m1",
		manager_id: "u1",
		manager_name: "Mona Manager",
		start_time: "2026-10-05T06:00:00.000Z",
		opening_float: 100,
		status: "MISSED" as const,
	},
	{
		id: "m2",
		manager_id: "u1",
		manager_name: "Sam Staff",
		start_time: "2026-10-06T06:00:00.000Z",
		opening_float: 50,
		status: "MISSED" as const,
	},
];

describe("MissedShiftsCard", () => {
	const onResolved = vi.fn().mockResolvedValue(undefined);
	beforeEach(() => {
		vi.clearAllMocks();
		global.fetch = mockFetch as unknown as typeof fetch;
		mockFetch.mockResolvedValue(
			jsonResponse({ message: "Shift closed successfully" }),
		);
	});

	it("renders nothing when there are no missed shifts", () => {
		const { container } = render(
			<MissedShiftsCard shifts={[]} onResolved={onResolved} />,
		);
		expect(container).toBeEmptyDOMElement();
	});

	it("lists each missed shift with who opened it and when", () => {
		render(<MissedShiftsCard shifts={missed} onResolved={onResolved} />);
		expect(screen.getByText(/missed shifts need closing/i)).toBeInTheDocument();
		expect(screen.getByText(/Mona Manager/)).toBeInTheDocument();
		expect(screen.getByText(/Sam Staff/)).toBeInTheDocument();
		expect(
			screen.getAllByRole("button", { name: "Close missed shift" }),
		).toHaveLength(2);
	});

	it("closes the shift with the counted cash and the reason, then refreshes", async () => {
		render(<MissedShiftsCard shifts={missed} onResolved={onResolved} />);
		const [cash] = screen.getAllByLabelText("Cash counted ($)");
		const [reason] = screen.getAllByLabelText("Reason (required)");
		fireEvent.change(cash, { target: { value: "100" } });
		fireEvent.change(reason, {
			target: { value: "Forgot to close on Sunday" },
		});
		fireEvent.click(
			screen.getAllByRole("button", { name: "Close missed shift" })[0],
		);

		await waitFor(() => expect(onResolved).toHaveBeenCalledTimes(1));
		const [url, init] = mockFetch.mock.calls[0];
		expect(String(url)).toMatch(/\/api\/shifts\/m1\/close$/);
		expect((init as RequestInit).method).toBe("POST");
		expect(JSON.parse(String((init as RequestInit).body))).toEqual({
			actualCashCounted: 100,
			shortageReason: "Forgot to close on Sunday",
		});
		expect(toast.success).toHaveBeenCalledWith("Missed shift closed.");
	});

	it("refuses to submit without a reason", async () => {
		render(<MissedShiftsCard shifts={missed} onResolved={onResolved} />);
		fireEvent.change(screen.getAllByLabelText("Cash counted ($)")[0], {
			target: { value: "100" },
		});
		fireEvent.click(
			screen.getAllByRole("button", { name: "Close missed shift" })[0],
		);
		expect(toast.error).toHaveBeenCalledWith("Please provide a reason.");
		expect(mockFetch).not.toHaveBeenCalled();
	});

	it("refuses to submit without a valid cash figure", async () => {
		render(<MissedShiftsCard shifts={missed} onResolved={onResolved} />);
		fireEvent.change(screen.getAllByLabelText("Reason (required)")[0], {
			target: { value: "forgot" },
		});
		fireEvent.click(
			screen.getAllByRole("button", { name: "Close missed shift" })[0],
		);
		expect(toast.error).toHaveBeenCalledWith(
			"Enter the cash that was counted for this shift.",
		);
		expect(mockFetch).not.toHaveBeenCalled();
	});

	it("shows the server's message and does not refresh when closing fails", async () => {
		mockFetch.mockResolvedValue(
			jsonResponse({ error: "Shift is already closed" }, 400),
		);
		render(<MissedShiftsCard shifts={missed} onResolved={onResolved} />);
		fireEvent.change(screen.getAllByLabelText("Cash counted ($)")[0], {
			target: { value: "100" },
		});
		fireEvent.change(screen.getAllByLabelText("Reason (required)")[0], {
			target: { value: "forgot" },
		});
		fireEvent.click(
			screen.getAllByRole("button", { name: "Close missed shift" })[0],
		);
		await waitFor(() =>
			expect(toast.error).toHaveBeenCalledWith("Shift is already closed"),
		);
		expect(onResolved).not.toHaveBeenCalled();
	});
});
