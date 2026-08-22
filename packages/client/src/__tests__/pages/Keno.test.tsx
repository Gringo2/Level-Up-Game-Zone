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
			screen.getByText("Sales: $100.00 | Payouts: $40.00"),
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

	it("shows dated rows and a period summary for the fetched range", async () => {
		mockFetch.mockResolvedValue(jsonResponse([kenoLog]));
		render(<Keno />);
		await screen.findByText("Net: $60.00");

		const summary = screen.getByTestId("keno-range-summary");
		expect(summary).toHaveTextContent("1 entry");
		expect(summary).toHaveTextContent("Net $60.00");
		expect(screen.getByText(/,\s*\d{1,2}:\d{2}\s*[AP]M/i)).toBeInTheDocument();
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
			screen.getByText("Sales: $100.00 | Payouts: $40.00"),
		).toBeInTheDocument();
		expect(await screen.findByText("Net: $75.00")).toBeInTheDocument();
		expect(screen.queryByText(/Sales: \$75/)).not.toBeInTheDocument();
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
		fireEvent.click(screen.getByRole("button", { name: "" }));

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
		fireEvent.click(screen.getByRole("button", { name: "" }));

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
		fireEvent.click(screen.getByRole("button", { name: "" }));

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
});
