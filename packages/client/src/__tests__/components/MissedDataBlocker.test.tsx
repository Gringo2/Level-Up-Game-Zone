/**
 * The component derives the resolve payload date via toLocaleDateString, which
 * is system-TZ-dependent. Pin the process TZ to UTC so the exact-date assertion
 * is deterministic on any machine (review observation #1).
 * @vitest-environment jsdom
 */
process.env.TZ = "UTC";

import "@testing-library/jest-dom/vitest";
import type { Shift } from "@level-up/shared";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MissedDataBlocker } from "../../components/MissedDataBlocker.js";
import { useShift } from "../../contexts/ShiftContext.js";

vi.mock("../../contexts/ShiftContext.js", () => ({
	useShift: vi.fn(),
}));

vi.mock("../../firebase", () => ({
	auth: {
		currentUser: { getIdToken: vi.fn().mockResolvedValue("mock-token") },
	},
}));

vi.mock("sonner", () => ({
	toast: { success: vi.fn(), error: vi.fn() },
}));

const staleShift: Shift = {
	id: "shift1",
	manager_id: "mgr1",
	manager_name: "Manager One",
	start_time: "2026-01-01T09:00:00.000Z",
	opening_float: 500,
	status: "OPEN",
};

const okResponse = (body: unknown) =>
	new Response(JSON.stringify(body), {
		status: 200,
		statusText: "OK",
		headers: { "Content-Type": "application/json" },
	});

beforeEach(() => {
	vi.clearAllMocks();
});

describe("MissedDataBlocker", () => {
	it("renders nothing when there is no missed data", () => {
		vi.mocked(useShift).mockReturnValue({
			activeShift: null,
			loadingShift: false,
			missedData: null,
			refetchShift: vi.fn().mockResolvedValue(undefined),
		});
		const { container } = render(<MissedDataBlocker />);
		expect(container).toBeEmptyDOMElement();
	});

	it("renders the stale-shift view with the remaining-items counter", () => {
		vi.mocked(useShift).mockReturnValue({
			activeShift: null,
			loadingShift: false,
			missedData: { missedShifts: [staleShift], gapDates: [] },
			refetchShift: vi.fn().mockResolvedValue(undefined),
		});
		render(<MissedDataBlocker />);
		expect(screen.getByText("Missing Data Detected")).toBeInTheDocument();
		expect(screen.getByText("Stale Shift Found")).toBeInTheDocument();
		expect(screen.getByText(/left open on/)).toBeInTheDocument();
		expect(
			screen.getByText("0 more items remaining after this."),
		).toBeInTheDocument();
	});

	it("renders the missing-day view for a gap date", () => {
		vi.mocked(useShift).mockReturnValue({
			activeShift: null,
			loadingShift: false,
			missedData: { missedShifts: [], gapDates: ["2026-01-05"] },
			refetchShift: vi.fn().mockResolvedValue(undefined),
		});
		render(<MissedDataBlocker />);
		expect(screen.getByText("Missing Day")).toBeInTheDocument();
		expect(screen.getByText(/No shift was recorded for/)).toBeInTheDocument();
	});

	it("resolves as SHOP_CLOSED and refetches on submit", async () => {
		const refetchShift = vi.fn().mockResolvedValue(undefined);
		vi.mocked(useShift).mockReturnValue({
			activeShift: null,
			loadingShift: false,
			missedData: { missedShifts: [staleShift], gapDates: [] },
			refetchShift,
		});
		global.fetch = vi.fn().mockResolvedValue(okResponse({ success: true }));

		render(<MissedDataBlocker />);
		fireEvent.click(screen.getByRole("button", { name: "Resolve & Continue" }));

		await waitFor(() => expect(toast.success).toHaveBeenCalled());
		expect(global.fetch).toHaveBeenCalledWith(
			expect.stringContaining("/api/shifts/resolve-missed"),
			expect.objectContaining({ method: "POST" }),
		);
		expect(refetchShift).toHaveBeenCalled();
	});

	it("blocks submission when DATA_FILLED lacks cash amounts", async () => {
		const refetchShift = vi.fn().mockResolvedValue(undefined);
		vi.mocked(useShift).mockReturnValue({
			activeShift: null,
			loadingShift: false,
			missedData: { missedShifts: [staleShift], gapDates: [] },
			refetchShift,
		});
		global.fetch = vi.fn();

		render(<MissedDataBlocker />);
		fireEvent.change(screen.getByRole("combobox"), {
			target: { value: "DATA_FILLED" },
		});

		// The two cash inputs are `required`, so native constraint validation
		// blocks a button-click submit while they are empty. Assert the form is
		// invalid, then dispatch the submit event directly to exercise the
		// component's own cash guard (which is unreachable via a normal click).
		const form = document.querySelector("form") as HTMLFormElement;
		expect(form.checkValidity()).toBe(false);
		fireEvent.submit(form);

		await waitFor(() =>
			expect(toast.error).toHaveBeenCalledWith("Please fill in cash amounts."),
		);
		expect(global.fetch).not.toHaveBeenCalled();
		expect(refetchShift).not.toHaveBeenCalled();
	});

	it("submits cash amounts when DATA_FILLED is populated", async () => {
		const refetchShift = vi.fn().mockResolvedValue(undefined);
		vi.mocked(useShift).mockReturnValue({
			activeShift: null,
			loadingShift: false,
			missedData: { missedShifts: [staleShift], gapDates: [] },
			refetchShift,
		});
		global.fetch = vi.fn().mockResolvedValue(okResponse({ success: true }));

		render(<MissedDataBlocker />);
		fireEvent.change(screen.getByRole("combobox"), {
			target: { value: "DATA_FILLED" },
		});
		const [expectedInput, actualInput] = screen.getAllByRole("spinbutton");
		fireEvent.change(expectedInput, { target: { value: "100" } });
		fireEvent.change(actualInput, { target: { value: "95.5" } });
		fireEvent.click(screen.getByRole("button", { name: "Resolve & Continue" }));

		await waitFor(() => expect(toast.success).toHaveBeenCalled());
		const [url, init] = vi.mocked(global.fetch).mock.calls[0];
		expect(url).toContain("/api/shifts/resolve-missed");
		const body = JSON.parse((init as RequestInit).body as string);
		expect(body).toMatchObject({
			date: "2026-01-01",
			status: "DATA_FILLED",
			expected_cash_calculated: 100,
			actual_cash_counted: 95.5,
			shift_id: "shift1",
		});
	});
});
