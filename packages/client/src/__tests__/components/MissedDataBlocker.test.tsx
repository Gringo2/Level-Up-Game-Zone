/**
 * The component derives the resolve payload date via toLocaleDateString, which
 * is system-TZ-dependent. Pin the process TZ to UTC so the exact-date assertion
 * is deterministic on any machine (review observation #1).
 * @vitest-environment jsdom
 */
process.env.TZ = "UTC";

import "@testing-library/jest-dom/vitest";
import type { Shift } from "@level-up/shared";
import {
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import { toast } from "sonner";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MissedDataBlocker } from "../../components/MissedDataBlocker.js";
import { useShift } from "../../contexts/ShiftContext.js";
import { safeJson } from "../../lib/api.js";

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

vi.mock("../../lib/api.js", () => ({
	API_BASE: "http://localhost:4000",
	safeJson: vi.fn(),
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

afterEach(() => {
	cleanup();
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

	it("shows error toast when resolve API returns non-OK", async () => {
		vi.mocked(useShift).mockReturnValue({
			activeShift: null,
			loadingShift: false,
			missedData: { missedShifts: [staleShift], gapDates: [] },
			refetchShift: vi.fn().mockResolvedValue(undefined),
		});
		(safeJson as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			error: "Shift not found",
		});
		global.fetch = vi.fn().mockResolvedValue(
			new Response(null, {
				status: 500,
				statusText: "Internal Server Error",
			}),
		);

		render(<MissedDataBlocker />);
		fireEvent.click(screen.getByRole("button", { name: "Resolve & Continue" }));

		await waitFor(() => {
			expect(toast.error).toHaveBeenCalledWith("Shift not found");
		});
	});

	it("shows fallback error when resolve API returns non-OK with no error field", async () => {
		vi.mocked(useShift).mockReturnValue({
			activeShift: null,
			loadingShift: false,
			missedData: { missedShifts: [staleShift], gapDates: [] },
			refetchShift: vi.fn().mockResolvedValue(undefined),
		});
		(safeJson as ReturnType<typeof vi.fn>).mockResolvedValueOnce({});
		global.fetch = vi.fn().mockResolvedValue(
			new Response(null, {
				status: 500,
				statusText: "Internal Server Error",
			}),
		);

		render(<MissedDataBlocker />);
		fireEvent.click(screen.getByRole("button", { name: "Resolve & Continue" }));

		await waitFor(() => {
			expect(toast.error).toHaveBeenCalledWith("Failed to resolve missed data");
		});
	});

	it("handles non-Error exception during resolve", async () => {
		vi.mocked(useShift).mockReturnValue({
			activeShift: null,
			loadingShift: false,
			missedData: { missedShifts: [staleShift], gapDates: [] },
			refetchShift: vi.fn().mockResolvedValue(undefined),
		});
		global.fetch = vi.fn().mockRejectedValueOnce("something broke");

		render(<MissedDataBlocker />);
		fireEvent.click(screen.getByRole("button", { name: "Resolve & Continue" }));

		await waitFor(() => {
			expect(toast.error).toHaveBeenCalledWith("Failed to resolve.");
		});
	});

	it("handles Error exception during resolve", async () => {
		vi.mocked(useShift).mockReturnValue({
			activeShift: null,
			loadingShift: false,
			missedData: { missedShifts: [staleShift], gapDates: [] },
			refetchShift: vi.fn().mockResolvedValue(undefined),
		});
		global.fetch = vi.fn().mockRejectedValueOnce(new Error("timeout"));

		render(<MissedDataBlocker />);
		fireEvent.click(screen.getByRole("button", { name: "Resolve & Continue" }));

		await waitFor(() => {
			expect(toast.error).toHaveBeenCalledWith("timeout");
		});
	});

	it("notes input updates state and is included in payload", async () => {
		const refetchShift = vi.fn().mockResolvedValue(undefined);
		vi.mocked(useShift).mockReturnValue({
			activeShift: null,
			loadingShift: false,
			missedData: { missedShifts: [staleShift], gapDates: [] },
			refetchShift,
		});
		global.fetch = vi.fn().mockResolvedValue(okResponse({ success: true }));

		render(<MissedDataBlocker />);
		const notesInput = screen.getByPlaceholderText("Reason or context...");
		fireEvent.change(notesInput, { target: { value: "forgot to close" } });
		fireEvent.click(screen.getByRole("button", { name: "Resolve & Continue" }));

		await waitFor(() => expect(global.fetch).toHaveBeenCalled());
		const [, init] = vi.mocked(global.fetch).mock.calls[0];
		const body = JSON.parse((init as RequestInit).body as string);
		expect(body).toMatchObject({ notes: "forgot to close" });
	});

	it("renders nothing when missedData has empty missedShifts and gapDates", () => {
		vi.mocked(useShift).mockReturnValue({
			activeShift: null,
			loadingShift: false,
			missedData: { missedShifts: [], gapDates: [] },
			refetchShift: vi.fn().mockResolvedValue(undefined),
		});
		const { container } = render(<MissedDataBlocker />);
		expect(container).toBeEmptyDOMElement();
	});
});
