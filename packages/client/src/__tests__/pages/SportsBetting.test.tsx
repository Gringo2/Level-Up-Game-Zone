/**
 * @vitest-environment jsdom
 */
import "@testing-library/jest-dom/vitest";
import type { SportsBettingLog } from "@level-up/shared";
import {
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import { toast } from "sonner";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuth } from "../../contexts/AuthContext.js";
import { SportsBetting } from "../../pages/SportsBetting.js";

afterEach(cleanup);

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

const managerUser = {
	uid: "u1",
	email: "manager@example.com",
	displayName: "Manager",
	role: "manager" as const,
};

const bettingLog: SportsBettingLog = {
	id: "betting-1",
	net_profit: 75,
	user_id: "u1",
	user_name: "Manager",
	date: new Date().toISOString(),
	verified: false,
};

const verifiedBettingLog: SportsBettingLog = {
	id: "betting-2",
	net_profit: 120,
	user_id: "u1",
	user_name: "Manager",
	date: new Date().toISOString(),
	verified: true,
};

const mockFetch = vi.fn();

describe("SportsBetting Page", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(useAuth).mockReturnValue({ user: managerUser, loading: false });
		window.scrollTo = vi.fn();
		mockFetch.mockImplementation((url: string, init?: RequestInit) => {
			if (init?.method === "DELETE") {
				return Promise.resolve(jsonResponse({ ok: true }));
			}
			if (init?.method === "PUT" && url.endsWith("/verify")) {
				return Promise.resolve(jsonResponse({ ok: true }));
			}
			if (init?.method === "PUT") {
				const body = JSON.parse(String(init.body || "{}"));
				return Promise.resolve(
					jsonResponse({
						...bettingLog,
						...body,
						id: bettingLog.id,
					}),
				);
			}
			if (init?.method === "POST") {
				const body = JSON.parse(String(init.body || "{}"));
				return Promise.resolve(
					jsonResponse({ ...bettingLog, ...body, id: "betting-new" }),
				);
			}
			return Promise.resolve(jsonResponse([bettingLog]));
		});
		global.fetch = mockFetch as unknown as typeof fetch;
	});

	// ── Rendering & Data Fetch ──────────────────────────────────────────────────

	it("renders today's sports betting logs after loading", async () => {
		render(<SportsBetting />);
		expect(await screen.findByText("Net: $75.00")).toBeInTheDocument();
		expect(screen.getByText("Unverified")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Verify" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /Edit/ })).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Delete sports betting log" }),
		).toBeInTheDocument();
	});

	it("renders verified badge and no verify button when log is verified", async () => {
		mockFetch.mockResolvedValue(jsonResponse([verifiedBettingLog]));
		render(<SportsBetting />);
		expect(await screen.findByText("Net: $120.00")).toBeInTheDocument();
		expect(screen.getByText("Verified")).toBeInTheDocument();
		expect(screen.queryByRole("button", { name: "Verify" })).toBeNull();
	});

	it("renders empty state when there are no logs", async () => {
		mockFetch.mockResolvedValue(jsonResponse([]));
		render(<SportsBetting />);
		expect(
			await screen.findByText("No sports betting logged today yet."),
		).toBeInTheDocument();
	});

	it("renders range summary banner with correct count and total", async () => {
		render(<SportsBetting />);
		await screen.findByText("Net: $75.00");
		const summary = screen.getByTestId("betting-range-summary");
		expect(summary).toHaveTextContent("1 entry");
		expect(summary).toHaveTextContent("Net $75.00");
	});

	it("shows an error toast when loading fails", async () => {
		mockFetch.mockResolvedValue(
			jsonResponse({ error: "Failed to fetch" }, false, 500),
		);
		render(<SportsBetting />);
		await waitFor(() =>
			expect(toast.error).toHaveBeenCalledWith("Failed to fetch"),
		);
	});

	// ── Entry Form Submissions ──────────────────────────────────────────────────

	it("logs a new sports betting entry via POST with positive net amount", async () => {
		render(<SportsBetting />);
		await screen.findByText("Net: $75.00");

		fireEvent.change(screen.getByLabelText("Net Amount ($)"), {
			target: { value: "150.50" },
		});
		expect(screen.getByText("$150.50")).toBeInTheDocument();

		const form = screen.getByText("New Entry").closest("form");
		fireEvent.submit(form as HTMLFormElement);

		await waitFor(() =>
			expect(mockFetch).toHaveBeenCalledWith(
				expect.stringMatching(/\/api\/sports-betting$/),
				expect.objectContaining({ method: "POST" }),
			),
		);
		await waitFor(() =>
			expect(toast.success).toHaveBeenCalledWith(
				"Sports betting logged successfully!",
			),
		);

		const [, init] = mockFetch.mock.calls.find(
			([, c]) => c?.method === "POST",
		) as [string, RequestInit];
		expect(JSON.parse(String(init.body))).toEqual({
			net_profit: 150.5,
			date: expect.any(String),
		});
	});

	it("logs a new sports betting entry with negative net amount (losing day)", async () => {
		render(<SportsBetting />);
		await screen.findByText("Net: $75.00");

		fireEvent.change(screen.getByLabelText("Net Amount ($)"), {
			target: { value: "-50.25" },
		});
		expect(screen.getByText("$-50.25")).toBeInTheDocument();

		const form = screen.getByText("New Entry").closest("form");
		fireEvent.submit(form as HTMLFormElement);

		await waitFor(() =>
			expect(mockFetch).toHaveBeenCalledWith(
				expect.stringMatching(/\/api\/sports-betting$/),
				expect.objectContaining({ method: "POST" }),
			),
		);

		const [, init] = mockFetch.mock.calls.find(
			([, c]) => c?.method === "POST",
		) as [string, RequestInit];
		expect(JSON.parse(String(init.body))).toEqual({
			net_profit: -50.25,
			date: expect.any(String),
		});
	});

	it("rejects garbage input on submit with an error toast", async () => {
		render(<SportsBetting />);
		await screen.findByText("Net: $75.00");

		fireEvent.change(screen.getByLabelText("Net Amount ($)"), {
			target: { value: "invalid-number" },
		});

		const form = screen.getByText("New Entry").closest("form");
		fireEvent.submit(form as HTMLFormElement);

		await waitFor(() =>
			expect(toast.error).toHaveBeenCalledWith(
				"Please enter a valid net amount.",
			),
		);
		expect(
			mockFetch.mock.calls.filter(([, c]) => c?.method === "POST"),
		).toHaveLength(0);
	});

	// ── Edit Flow ───────────────────────────────────────────────────────────────

	it("edits a sports betting log via PUT when editReason is provided", async () => {
		render(<SportsBetting />);
		await screen.findByText("Net: $75.00");

		fireEvent.click(screen.getByRole("button", { name: /Edit/ }));
		expect(screen.getByText("Edit Entry")).toBeInTheDocument();

		fireEvent.change(screen.getByLabelText("Reason for Edit (Required)"), {
			target: { value: "Software recalibration" },
		});
		fireEvent.change(screen.getByLabelText("Net Amount ($)"), {
			target: { value: "85" },
		});

		const form = screen.getByText("Edit Entry").closest("form");
		fireEvent.submit(form as HTMLFormElement);

		await waitFor(() =>
			expect(mockFetch).toHaveBeenCalledWith(
				expect.stringMatching(/\/api\/sports-betting\/betting-1$/),
				expect.objectContaining({ method: "PUT" }),
			),
		);
		await waitFor(() =>
			expect(toast.success).toHaveBeenCalledWith(
				"Sports betting log updated successfully!",
			),
		);
	});

	it("cancels edit mode and resets form to New Entry", async () => {
		render(<SportsBetting />);
		await screen.findByText("Net: $75.00");

		fireEvent.click(screen.getByRole("button", { name: /Edit/ }));
		expect(screen.getByText("Edit Entry")).toBeInTheDocument();

		fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
		expect(screen.getByText("New Entry")).toBeInTheDocument();
		expect(
			screen.queryByLabelText("Reason for Edit (Required)"),
		).not.toBeInTheDocument();
	});

	// ── Delete Flow ─────────────────────────────────────────────────────────────

	it("deletes a sports betting log via DELETE after reason is provided", async () => {
		render(<SportsBetting />);
		await screen.findByText("Net: $75.00");

		fireEvent.click(
			screen.getByRole("button", { name: "Delete sports betting log" }),
		);
		expect(screen.getByText("Delete Sports Betting Log")).toBeInTheDocument();

		fireEvent.change(screen.getByPlaceholderText("Reason for deletion..."), {
			target: { value: "Accidental double entry" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Confirm Delete" }));

		await waitFor(() =>
			expect(mockFetch).toHaveBeenCalledWith(
				expect.stringMatching(/\/api\/sports-betting\/betting-1$/),
				expect.objectContaining({ method: "DELETE" }),
			),
		);
		await waitFor(() =>
			expect(toast.success).toHaveBeenCalledWith(
				"Sports betting log deleted successfully!",
			),
		);
		await waitFor(() =>
			expect(screen.queryByText("Net: $75.00")).not.toBeInTheDocument(),
		);
	});

	it("cancels delete dialog and keeps the log", async () => {
		render(<SportsBetting />);
		await screen.findByText("Net: $75.00");

		fireEvent.click(
			screen.getByRole("button", { name: "Delete sports betting log" }),
		);
		expect(screen.getByText("Delete Sports Betting Log")).toBeInTheDocument();

		fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
		expect(
			screen.queryByText("Delete Sports Betting Log"),
		).not.toBeInTheDocument();
		expect(screen.getByText("Net: $75.00")).toBeInTheDocument();
	});

	// ── Verify Flow ─────────────────────────────────────────────────────────────

	it("verifies a sports betting log via PUT /api/sports-betting/:id/verify", async () => {
		render(<SportsBetting />);
		await screen.findByText("Net: $75.00");

		fireEvent.click(screen.getByRole("button", { name: "Verify" }));

		await waitFor(() =>
			expect(mockFetch).toHaveBeenCalledWith(
				expect.stringMatching(/\/api\/sports-betting\/betting-1\/verify$/),
				expect.objectContaining({ method: "PUT" }),
			),
		);
		await waitFor(() =>
			expect(toast.success).toHaveBeenCalledWith("Log verified!"),
		);
		expect(await screen.findByText("Verified")).toBeInTheDocument();
	});

	// ── visibilitychange Refresh ────────────────────────────────────────────────

	it("re-fetches logs when tab becomes visible again", async () => {
		render(<SportsBetting />);
		await screen.findByText("Net: $75.00");
		const callsBefore = mockFetch.mock.calls.length;

		Object.defineProperty(document, "visibilityState", {
			value: "visible",
			configurable: true,
		});
		document.dispatchEvent(new Event("visibilitychange"));

		await waitFor(() =>
			expect(mockFetch.mock.calls.length).toBeGreaterThan(callsBefore),
		);
	});

	// ── Network Error Path ──────────────────────────────────────────────────────

	it("shows error toast when POST fails and keeps form intact", async () => {
		render(<SportsBetting />);
		await screen.findByText("Net: $75.00");

		mockFetch.mockImplementation((_url: string, init?: RequestInit) => {
			if (init?.method === "POST") {
				return Promise.resolve(
					jsonResponse({ error: "Network disconnected" }, false, 500),
				);
			}
			return Promise.resolve(jsonResponse([bettingLog]));
		});

		fireEvent.change(screen.getByLabelText("Net Amount ($)"), {
			target: { value: "200" },
		});

		const form = screen.getByText("New Entry").closest("form");
		fireEvent.submit(form as HTMLFormElement);

		await waitFor(() =>
			expect(toast.error).toHaveBeenCalledWith("Network disconnected"),
		);
		expect(screen.getByLabelText("Net Amount ($)")).toHaveValue(200);
	});

	// ── Date Range Controls & Pagination ───────────────────────────────────────

	it("applies date range filter and fetches with range parameters", async () => {
		render(<SportsBetting />);
		await screen.findByText("Net: $75.00");
		const callsBefore = mockFetch.mock.calls.length;

		fireEvent.change(screen.getByLabelText("From"), {
			target: { value: "2026-08-01" },
		});
		fireEvent.change(screen.getByLabelText("To"), {
			target: { value: "2026-08-07" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Apply" }));

		await waitFor(() =>
			expect(mockFetch.mock.calls.length).toBeGreaterThan(callsBefore),
		);
		const lastCall = mockFetch.mock.calls.at(-1);
		expect(lastCall?.[0]).toContain("startDate=");
		expect(lastCall?.[0]).toContain("endDate=");
		expect(
			screen.getByText("Sports betting entries in the selected range."),
		).toBeInTheDocument();
	});

	it("resets range to today when Today button is clicked", async () => {
		render(<SportsBetting />);
		await screen.findByText("Net: $75.00");

		fireEvent.change(screen.getByLabelText("From"), {
			target: { value: "2026-08-01" },
		});
		await waitFor(() =>
			expect(screen.getByRole("button", { name: "Today" })).toBeEnabled(),
		);
		fireEvent.click(screen.getByRole("button", { name: "Today" }));

		await waitFor(() =>
			expect(
				screen.getByText("Recent sports betting entries logged today."),
			).toBeInTheDocument(),
		);
	});

	it("displays validation warning and disables Apply when From > To", async () => {
		render(<SportsBetting />);
		await screen.findByText("Net: $75.00");

		fireEvent.change(screen.getByLabelText("From"), {
			target: { value: "2026-08-10" },
		});
		fireEvent.change(screen.getByLabelText("To"), {
			target: { value: "2026-08-01" },
		});

		expect(
			screen.getByText("From date must be on or before To"),
		).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Apply" })).toBeDisabled();
	});

	it("paginates history entries when count exceeds page size", async () => {
		const manyLogs: SportsBettingLog[] = Array.from({ length: 15 }, (_, i) => ({
			id: `betting-${i}`,
			net_profit: 10 + i,
			user_id: "u1",
			user_name: "Manager",
			date: new Date(Date.now() - i * 60000).toISOString(),
			verified: true,
		}));

		mockFetch.mockResolvedValue(jsonResponse(manyLogs));
		render(<SportsBetting />);

		expect(await screen.findByText("Page 1 of 3")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();
		expect(screen.getByRole("button", { name: "Next" })).toBeEnabled();

		fireEvent.click(screen.getByRole("button", { name: "Next" }));
		expect(screen.getByText("Page 2 of 3")).toBeInTheDocument();

		fireEvent.click(screen.getByRole("button", { name: "Previous" }));
		expect(screen.getByText("Page 1 of 3")).toBeInTheDocument();
	});

	it("loads older logs when cursor is provided", async () => {
		const payload = {
			data: [bettingLog],
			nextCursor: "cursor-token-abc",
		};
		mockFetch.mockImplementation(() => Promise.resolve(jsonResponse(payload)));
		render(<SportsBetting />);

		const loadOlderBtn = await screen.findByTestId("load-older");
		expect(loadOlderBtn).toBeInTheDocument();

		fireEvent.click(loadOlderBtn);
		await waitFor(() =>
			expect(mockFetch).toHaveBeenCalledWith(
				expect.stringContaining("cursor=cursor-token-abc"),
				expect.anything(),
			),
		);
	});

	it("sets range to yesterday when Yesterday button is clicked", async () => {
		mockFetch.mockImplementation(() =>
			Promise.resolve(jsonResponse([bettingLog])),
		);
		render(<SportsBetting />);
		await screen.findByText("Net: $75.00");

		const yesterdayBtn = screen.getByRole("button", { name: "Yesterday" });
		expect(yesterdayBtn).toBeInTheDocument();

		fireEvent.click(yesterdayBtn);

		const fromInput = screen.getByLabelText("From") as HTMLInputElement;
		const toInput = screen.getByLabelText("To") as HTMLInputElement;

		expect(fromInput.value).toBe(toInput.value);
		expect(fromInput.value).not.toBe("");
	});
});
