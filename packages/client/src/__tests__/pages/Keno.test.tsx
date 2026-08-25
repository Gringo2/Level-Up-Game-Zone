/**
 * @vitest-environment jsdom
 */
import "@testing-library/jest-dom/vitest";
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
import { getShopEndOfDay, getShopStartOfDay } from "../../lib/dateUtils.js";
import { groupLogsByDay, HISTORY_PAGE_SIZE } from "../../lib/history.js";
import { Keno, parseNetAmountInput } from "../../pages/Keno.js";

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

const kenoLog = {
	id: "keno-1",
	sales: 100,
	payouts: 40,
	net_profit: 60,
	user_id: "u1",
	date: new Date().toISOString(),
	verified: false,
};

const netOnlyKenoLog = {
	id: "keno-2",
	net_profit: 75,
	user_id: "u1",
	date: new Date().toISOString(),
	verified: true,
};

const mockFetch = vi.fn();

describe("Keno", () => {
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
						...kenoLog,
						...body,
						id: kenoLog.id,
					}),
				);
			}
			if (init?.method === "POST") {
				return Promise.resolve(jsonResponse({ ...kenoLog, id: "keno-new" }));
			}
			return Promise.resolve(jsonResponse([kenoLog]));
		});
		global.fetch = mockFetch as unknown as typeof fetch;
	});

	it("renders today's keno logs after loading", async () => {
		render(<Keno />);
		expect(await screen.findByText("Net: $60.00")).toBeInTheDocument();
		expect(
			screen.getByText("Sales $100.00 · Payouts $40.00"),
		).toBeInTheDocument();
		expect(screen.getByText("Unverified")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Verify" })).toBeInTheDocument();
	});

	it("renders the empty state when there are no keno logs", async () => {
		mockFetch.mockResolvedValue(jsonResponse([]));
		render(<Keno />);
		expect(
			await screen.findByText("No Keno logged today yet."),
		).toBeInTheDocument();
	});

	it("shows an error toast when loading fails", async () => {
		mockFetch.mockResolvedValue(jsonResponse({ error: "boom" }, false, 500));
		render(<Keno />);
		await waitFor(() => expect(toast.error).toHaveBeenCalledWith("boom"));
	});

	it("fetches today's range server-side on load instead of fetching all", async () => {
		mockFetch.mockResolvedValue(jsonResponse([kenoLog]));
		render(<Keno />);
		await screen.findByText("Net: $60.00");

		const [url] = mockFetch.mock.calls[0] as [string];
		expect(url).toMatch(/\/api\/keno\?startDate=/);
		expect(url).toContain("endDate=");
	});

	it("applies a custom range and refetches with the selected bounds", async () => {
		mockFetch.mockResolvedValue(jsonResponse([kenoLog]));
		render(<Keno />);
		await screen.findByText("Net: $60.00");
		const callsAfterLoad = mockFetch.mock.calls.length;

		fireEvent.change(screen.getByLabelText("From"), {
			target: { value: "2026-08-01" },
		});
		fireEvent.change(screen.getByLabelText("To"), {
			target: { value: "2026-08-07" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Apply" }));

		await waitFor(() =>
			expect(mockFetch.mock.calls.length).toBeGreaterThan(callsAfterLoad),
		);
		const latest = mockFetch.mock.calls.at(-1) as [string];
		const expectedStart = encodeURIComponent(
			getShopStartOfDay(new Date("2026-08-01T00:00:00")).toISOString(),
		);
		const expectedEnd = encodeURIComponent(
			getShopEndOfDay(new Date("2026-08-07T00:00:00")).toISOString(),
		);
		expect(latest[0]).toContain(`startDate=${expectedStart}`);
		expect(latest[0]).toContain(`endDate=${expectedEnd}`);
		expect(
			screen.getByText("Keno entries in the selected range."),
		).toBeInTheDocument();
		expect(
			screen.queryByText("No Keno logged today yet."),
		).not.toBeInTheDocument();
	});

	it("parseNetAmountInput rejects NaN-holes and keeps negatives/decimals legal", () => {
		expect(parseNetAmountInput("--1")).toBeNull();
		expect(parseNetAmountInput("")).toBeNull();
		expect(parseNetAmountInput("abc")).toBeNull();
		expect(parseNetAmountInput("1e-")).toBeNull();
		expect(parseNetAmountInput("75")).toBe(75);
		expect(parseNetAmountInput("-25.5")).toBe(-25.5);
		expect(parseNetAmountInput("0.01")).toBe(0.01);
	});

	it("shows day-grouped headers and period summary for the fetched range", async () => {
		mockFetch.mockResolvedValue(jsonResponse([kenoLog]));
		render(<Keno />);
		await screen.findByText("Net: $60.00");

		const summary = screen.getByTestId("keno-range-summary");
		expect(summary).toHaveTextContent("1 entry");
		expect(summary).toHaveTextContent("Net $60.00");
		const banner = screen.getByTestId("keno-range-summary");
		expect(banner).toHaveTextContent("Net $60.00");
	});

	it("disables row actions while a verification request is in flight", async () => {
		mockFetch.mockResolvedValue(jsonResponse([kenoLog]));
		render(<Keno />);
		await screen.findByText("Net: $60.00");

		let resolveVerify: (value: Response) => void = () => {};
		const deferred = new Promise<Response>((resolve) => {
			resolveVerify = resolve;
		});
		const inflightFetch = vi
			.fn()
			.mockImplementation((url: string, init?: RequestInit) => {
				if (init?.method === "PUT" && url.endsWith("/verify")) {
					return deferred;
				}
				return jsonResponse([kenoLog]);
			});
		global.fetch = inflightFetch as unknown as typeof fetch;

		fireEvent.click(screen.getByRole("button", { name: "Verify" }));

		expect(screen.getByRole("button", { name: "Verify" })).toBeDisabled();
		expect(screen.getByRole("button", { name: /Edit/ })).toBeDisabled();

		resolveVerify(jsonResponse({ ...kenoLog, verified: true }));
		await screen.findByText("Verified");

		await waitFor(() =>
			expect(screen.getByRole("button", { name: /Edit/ })).toBeEnabled(),
		);
	});

	it("renders legacy entries with sales/payouts and net-only entries without them", async () => {
		const nullFieldsKenoLog = {
			id: "keno-3",
			sales: null,
			payouts: null,
			net_profit: 10,
			user_id: "u1",
			date: new Date().toISOString(),
			verified: true,
		};
		mockFetch.mockResolvedValue(
			jsonResponse([kenoLog, netOnlyKenoLog, nullFieldsKenoLog]),
		);
		render(<Keno />);
		expect(await screen.findByText("Net: $60.00")).toBeInTheDocument();
		expect(
			screen.getByText("Sales $100.00 · Payouts $40.00"),
		).toBeInTheDocument();
		expect(await screen.findByText("Net: $75.00")).toBeInTheDocument();
		expect(screen.queryByText(/Sales \$75/)).not.toBeInTheDocument();
		expect(screen.queryByText(/Payouts: \$75/)).not.toBeInTheDocument();
		expect(await screen.findByText("Net: $10.00")).toBeInTheDocument();
	});

	it("logs a new keno entry via POST with the entered net amount", async () => {
		mockFetch.mockResolvedValueOnce(jsonResponse([kenoLog]));
		render(<Keno />);
		await screen.findByText("Net: $60.00");

		fireEvent.change(screen.getByLabelText("Net Amount ($)"), {
			target: { value: "75" },
		});
		expect(screen.getByText("$75.00")).toBeInTheDocument();

		const form = screen.getByText("Daily Keno Entry").closest("form");
		fireEvent.submit(form as HTMLFormElement);

		await waitFor(() =>
			expect(mockFetch).toHaveBeenCalledWith(
				expect.stringMatching(/\/api\/keno$/),
				expect.objectContaining({ method: "POST" }),
			),
		);
		await waitFor(() =>
			expect(toast.success).toHaveBeenCalledWith("Keno logged successfully!"),
		);
		const [, init] = mockFetch.mock.calls[1] as [string, RequestInit];
		expect(JSON.parse(String(init.body))).toEqual({
			net_profit: 75,
			date: expect.any(String),
		});
	});

	it("verifies a keno log via PUT", async () => {
		render(<Keno />);
		await screen.findByText("Net: $60.00");
		fireEvent.click(screen.getByRole("button", { name: "Verify" }));

		await waitFor(() =>
			expect(mockFetch).toHaveBeenCalledWith(
				expect.stringMatching(/\/api\/keno\/keno-1\/verify$/),
				expect.objectContaining({ method: "PUT" }),
			),
		);
		await waitFor(() =>
			expect(toast.success).toHaveBeenCalledWith("Log verified!"),
		);
		expect(await screen.findByText("Verified")).toBeInTheDocument();
	});

	it("deletes a keno log via DELETE after a reason is provided", async () => {
		render(<Keno />);
		await screen.findByText("Net: $60.00");
		fireEvent.click(screen.getByRole("button", { name: "Delete keno log" }));

		fireEvent.change(screen.getByPlaceholderText("Reason for deletion..."), {
			target: { value: "Wrong entry" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Confirm Delete" }));

		await waitFor(() =>
			expect(mockFetch).toHaveBeenCalledWith(
				expect.stringMatching(/\/api\/keno\/keno-1$/),
				expect.objectContaining({ method: "DELETE" }),
			),
		);
		await waitFor(() =>
			expect(toast.success).toHaveBeenCalledWith(
				"Keno log deleted successfully!",
			),
		);
		await waitFor(() =>
			expect(screen.queryByText("Net: $60.00")).not.toBeInTheDocument(),
		);
	});

	it("edits a keno log via PUT when a reason is provided", async () => {
		render(<Keno />);
		await screen.findByText("Net: $60.00");
		fireEvent.click(screen.getByRole("button", { name: "Edit" }));

		fireEvent.change(screen.getByLabelText("Reason for Edit (Required)"), {
			target: { value: "Typo in payouts" },
		});
		fireEvent.change(screen.getByLabelText("Net Amount ($)"), {
			target: { value: "55" },
		});
		const form = screen.getByText("Update Keno").closest("form");
		fireEvent.submit(form as HTMLFormElement);

		await waitFor(() =>
			expect(mockFetch).toHaveBeenCalledWith(
				expect.stringMatching(/\/api\/keno\/keno-1$/),
				expect.objectContaining({ method: "PUT" }),
			),
		);
		await waitFor(() =>
			expect(toast.success).toHaveBeenCalledWith(
				"Keno log updated successfully!",
			),
		);
		expect(await screen.findByText("Net: $55.00")).toBeInTheDocument();
	});

	it("hides management actions from staff users", async () => {
		vi.mocked(useAuth).mockReturnValue({
			user: {
				uid: "u2",
				email: "s@example.com",
				displayName: "Staff",
				role: "staff",
			},
			loading: false,
		});
		render(<Keno />);
		await screen.findByText("Net: $60.00");
		expect(
			screen.queryByRole("button", { name: "Verify" }),
		).not.toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: "Edit" }),
		).not.toBeInTheDocument();
	});

	it("shows error toast when POST keno fails", async () => {
		mockFetch.mockResolvedValueOnce(jsonResponse([kenoLog]));
		render(<Keno />);
		await screen.findByText("Net: $60.00");

		const failFetch = vi
			.fn()
			.mockImplementation((_url: string, init?: RequestInit) => {
				if (init?.method === "POST") {
					return Promise.reject(new Error("Server error"));
				}
				return jsonResponse([kenoLog]);
			});
		global.fetch = failFetch as unknown as typeof fetch;

		fireEvent.change(screen.getByLabelText("Net Amount ($)"), {
			target: { value: "75" },
		});
		const form = screen.getByText("Daily Keno Entry").closest("form");
		fireEvent.submit(form as HTMLFormElement);

		await waitFor(() =>
			expect(toast.error).toHaveBeenCalledWith("Server error"),
		);
	});

	it("shows error toast when PUT keno fails in edit mode", async () => {
		mockFetch.mockResolvedValueOnce(jsonResponse([kenoLog]));
		render(<Keno />);
		await screen.findByText("Net: $60.00");
		fireEvent.click(screen.getByRole("button", { name: "Edit" }));

		const failFetch = vi
			.fn()
			.mockImplementation((url: string, init?: RequestInit) => {
				if (init?.method === "PUT" && !url.endsWith("/verify")) {
					return Promise.reject(new Error("Server error"));
				}
				return jsonResponse([kenoLog]);
			});
		global.fetch = failFetch as unknown as typeof fetch;

		fireEvent.change(screen.getByLabelText("Reason for Edit (Required)"), {
			target: { value: "Correction" },
		});
		const form = screen.getByText("Update Keno").closest("form");
		fireEvent.submit(form as HTMLFormElement);

		await waitFor(() =>
			expect(toast.error).toHaveBeenCalledWith("Server error"),
		);
	});

	it("dismisses delete confirmation when Cancel is clicked", async () => {
		render(<Keno />);
		await screen.findByText("Net: $60.00");
		fireEvent.click(screen.getByRole("button", { name: "Delete keno log" }));

		expect(
			screen.getByPlaceholderText("Reason for deletion..."),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Confirm Delete" }),
		).toBeInTheDocument();

		fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

		expect(
			screen.queryByPlaceholderText("Reason for deletion..."),
		).not.toBeInTheDocument();
		expect(screen.getByText("Net: $60.00")).toBeInTheDocument();
	});

	it("shows error toast when delete keno log fails", async () => {
		render(<Keno />);
		await screen.findByText("Net: $60.00");
		fireEvent.click(screen.getByRole("button", { name: "Delete keno log" }));

		const failFetch = vi
			.fn()
			.mockImplementation((_url: string, init?: RequestInit) => {
				if (init?.method === "DELETE") {
					return Promise.reject(new Error("Server error"));
				}
				return jsonResponse([kenoLog]);
			});
		global.fetch = failFetch as unknown as typeof fetch;

		fireEvent.change(screen.getByPlaceholderText("Reason for deletion..."), {
			target: { value: "Duplicate" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Confirm Delete" }));

		await waitFor(() =>
			expect(toast.error).toHaveBeenCalledWith("Server error"),
		);
	});

	it("shows error toast when verify keno log fails", async () => {
		render(<Keno />);
		await screen.findByText("Net: $60.00");

		const failFetch = vi
			.fn()
			.mockImplementation((url: string, init?: RequestInit) => {
				if (init?.method === "PUT" && url.endsWith("/verify")) {
					return Promise.reject(new Error("Server error"));
				}
				return jsonResponse([kenoLog]);
			});
		global.fetch = failFetch as unknown as typeof fetch;

		fireEvent.click(screen.getByRole("button", { name: "Verify" }));

		await waitFor(() =>
			expect(toast.error).toHaveBeenCalledWith("Server error"),
		);
	});

	it("refetches keno logs when the tab becomes visible again", async () => {
		render(<Keno />);
		await waitFor(() => expect(mockFetch).toHaveBeenCalled());

		const callsBefore = mockFetch.mock.calls.length;
		document.dispatchEvent(new Event("visibilitychange"));

		await waitFor(() => {
			expect(mockFetch.mock.calls.length).toBeGreaterThan(callsBefore);
		});
	});

	it("updates the entry date field", async () => {
		render(<Keno />);
		await waitFor(() => expect(mockFetch).toHaveBeenCalled());

		fireEvent.change(screen.getByLabelText("Date"), {
			target: { value: "2025-06-01" },
		});

		expect(screen.getByLabelText("Date")).toHaveValue("2025-06-01");
	});

	describe("day grouping + pagination (M-70)", () => {
		const day1 = new Date("2026-08-21T18:42:00").toISOString(); // Fri
		const day2 = new Date("2026-08-20T09:15:00").toISOString(); // Thu
		const sixLogs = [
			{ ...kenoLog, id: "k1", date: day1, net_profit: 10 },
			{ ...kenoLog, id: "k2", date: day1, net_profit: -4, verified: false },
			{ ...kenoLog, id: "k3", date: day1, net_profit: 6 },
			{ ...kenoLog, id: "k4", date: day1, net_profit: 1 },
			{ ...kenoLog, id: "k5", date: day1, net_profit: 2 },
			{ ...kenoLog, id: "k6", date: day2, net_profit: 50 },
		];

		it("groups logs by calendar day preserving order with weekday labels and subtotals", () => {
			const groups = groupLogsByDay(sixLogs, (log) => log.net_profit);
			expect(groups).toHaveLength(2);
			expect(groups[0].label).toMatch(/Fri, Aug 21/);
			expect(groups[0].count).toBe(5);
			expect(groups[0].net).toBe(15);
			expect(groups[1].label).toMatch(/Thu, Aug 20/);
			expect(groups[1].count).toBe(1);
			expect(groups[1].net).toBe(50);
		});

		it("returns empty groups for empty input", () => {
			expect(groupLogsByDay([], (log) => log.net_profit)).toEqual([]);
		});

		it("shows pager only beyond page size and navigates with bounds", async () => {
			mockFetch.mockImplementation(() =>
				Promise.resolve(jsonResponse(sixLogs)),
			);
			render(<Keno />);
			expect(sixLogs.length).toBeGreaterThan(HISTORY_PAGE_SIZE);
			expect(await screen.findByText("Net: $10.00")).toBeInTheDocument();
			expect(screen.queryByText("Net: $50.00")).not.toBeInTheDocument();
			expect(screen.getByText("Page 1 of 2")).toBeInTheDocument();
			const prev = screen.getByRole("button", { name: "Previous" });
			const next = screen.getByRole("button", { name: "Next" });
			expect(prev).toBeDisabled();

			fireEvent.click(next);
			expect(await screen.findByText("Net: $50.00")).toBeInTheDocument();
			expect(screen.queryByText("Net: $10.00")).not.toBeInTheDocument();
			expect(next).toBeDisabled();
			expect(prev).toBeEnabled();

			fireEvent.click(prev);
			expect(await screen.findByText("Net: $10.00")).toBeInTheDocument();
		});

		it("renders day headers with weekday labels and no per-day totals", async () => {
			mockFetch.mockImplementation(() =>
				Promise.resolve(jsonResponse(sixLogs)),
			);
			render(<Keno />);
			const header = await screen.findByText(/Fri, Aug 21/);
			expect(header).toBeInTheDocument();
			expect(
				screen.queryByTestId(/keno-day-subtotal-/),
			).not.toBeInTheDocument();
		});

		it("resets to page 1 when the range is refetched", async () => {
			mockFetch.mockImplementation(() =>
				Promise.resolve(jsonResponse(sixLogs)),
			);
			render(<Keno />);
			await screen.findByText("Page 1 of 2");
			fireEvent.click(screen.getByRole("button", { name: "Next" }));
			expect(await screen.findByText("Net: $50.00")).toBeInTheDocument();

			fireEvent.click(screen.getByRole("button", { name: "Apply" }));
			expect(await screen.findByText("Page 1 of 2")).toBeInTheDocument();
			expect(screen.getByText("Net: $10.00")).toBeInTheDocument();
		});
	});

	it("TD-047: blocks Apply with hint when From is after To, Today resets", async () => {
		// TD-057: pin Date so component wall-clock "today" equals the hardcoded
		// range below, independent of the real calendar (ACP-007).
		vi.useFakeTimers({ toFake: ["Date"] });
		vi.setSystemTime(new Date("2026-08-23T12:00:00Z"));
		try {
			render(<Keno />);
			await screen.findByText("Net: $60.00");

			fireEvent.change(screen.getByLabelText("From"), {
				target: { value: "2026-08-23" },
			});
			fireEvent.change(screen.getByLabelText("To"), {
				target: { value: "2026-08-20" },
			});

			const apply = screen.getByRole("button", { name: "Apply" });
			expect(apply).toBeDisabled();
			expect(
				screen.getByText("From date must be on or before To"),
			).toBeInTheDocument();

			fireEvent.click(screen.getByRole("button", { name: "Today" }));
			await waitFor(() => {
				expect(
					screen.queryByText("From date must be on or before To"),
				).not.toBeInTheDocument();
			});
			expect(screen.getByRole("button", { name: "Apply" })).toBeEnabled();
		} finally {
			vi.useRealTimers();
		}
	});

	it("TD-048: shows in-flight state on Apply until the fetch resolves", async () => {
		let resolveFetch: (v: Response) => void = () => {};
		const deferred = new Promise<Response>((r) => {
			resolveFetch = r;
		});
		mockFetch.mockImplementation(() => deferred);

		render(<Keno />);
		const apply = screen.getByRole("button", { name: "Apply" });
		expect(apply).toBeDisabled();
		expect(screen.getByTestId("history-loading")).toBeInTheDocument();

		resolveFetch(jsonResponse([kenoLog]));
		await screen.findByText("Net: $60.00");
		expect(apply).toBeEnabled();
		expect(screen.queryByTestId("history-loading")).not.toBeInTheDocument();
	});

	it("TD-050: delete button exposes an accessible name", async () => {
		render(<Keno />);
		const row = await screen.findByText(/Net:/);
		expect(row).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Delete keno log" }),
		).toBeInTheDocument();
	});
	it("TD-032: consumes pagination envelope and appends older pages", async () => {
		const first = {
			id: "k1",
			net_profit: 10,
			date: new Date().toISOString(),
			user_id: "u1",
			user_name: "M",
		};
		const older = {
			id: "k0",
			net_profit: 99,
			date: new Date().toISOString(),
			user_id: "u1",
			user_name: "M",
		};
		mockFetch.mockImplementation((url: string) => {
			const u = String(url);
			if (u.includes("cursor=")) {
				return Promise.resolve(
					jsonResponse({ data: [older], nextCursor: null }),
				);
			}
			return Promise.resolve(jsonResponse({ data: [first], nextCursor: "c2" }));
		});

		render(<Keno />);
		expect(await screen.findByTestId("load-older")).toBeInTheDocument();

		fireEvent.click(screen.getByRole("button", { name: "Load older" }));

		expect(await screen.findByText(/\$99\.00/)).toBeInTheDocument();
	});
});
