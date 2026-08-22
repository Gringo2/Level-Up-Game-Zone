/**
 * @vitest-environment jsdom
 */
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuth } from "../../contexts/AuthContext.js";
import { getShopEndOfDay, getShopStartOfDay } from "../../lib/dateUtils.js";
import { GameSales } from "../../pages/GameSales.js";

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

const rates = [
	{
		id: "rate-1",
		game_name: "PS4",
		price_per_unit: 5,
		unit_type: "Hour",
		isActive: true,
	},
	{
		id: "rate-2",
		game_name: "Pool",
		price_per_unit: 2,
		unit_type: "Game",
		isActive: true,
	},
];

const salesLog = {
	id: "sale-1",
	game_id: "rate-1",
	game_name: "PS4",
	quantity_sold: 2,
	rate_applied: 5,
	calculated_total: 10,
	user_id: "u1",
	date: new Date().toISOString(),
};

const mockFetch = vi.fn();

describe("GameSales", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(useAuth).mockReturnValue({ user: managerUser, loading: false });
		window.scrollTo = vi.fn();
		mockFetch.mockImplementation((url: string, init?: RequestInit) => {
			if (init?.method === "DELETE") {
				return Promise.resolve(jsonResponse({ ok: true }));
			}
			if (init?.method === "PUT") {
				const body = JSON.parse(String(init.body || "{}"));
				return Promise.resolve(
					jsonResponse({ ...salesLog, ...body, id: salesLog.id }),
				);
			}
			if (init?.method === "POST" && url.endsWith("/api/rates")) {
				const body = JSON.parse(String(init.body || "{}"));
				return Promise.resolve(
					jsonResponse({ id: `rate-${Date.now()}`, ...body }),
				);
			}
			if (init?.method === "POST") {
				return Promise.resolve(jsonResponse({ ...salesLog, id: "sale-new" }));
			}
			if (url.endsWith("/api/rates")) {
				return Promise.resolve(jsonResponse(rates));
			}
			return Promise.resolve(jsonResponse([salesLog]));
		});
		global.fetch = mockFetch as unknown as typeof fetch;
	});

	it("renders games and today's sales logs after loading", async () => {
		render(<GameSales />);
		expect(await screen.findByText(/2 units @ \$5\.00/)).toBeInTheDocument();
		expect(screen.getByRole("option", { name: /PS4/ })).toBeInTheDocument();
		expect(screen.getByRole("option", { name: /Pool/ })).toBeInTheDocument();
		expect(screen.queryByText("No games configured!")).not.toBeInTheDocument();
	});

	it("fetches today's sales range server-side on load", async () => {
		mockFetch.mockImplementation((url: string) => {
			if (String(url).endsWith("/api/rates")) {
				return Promise.resolve(jsonResponse(rates));
			}
			return Promise.resolve(jsonResponse([salesLog]));
		});
		render(<GameSales />);
		await screen.findByText(/2 units @ \$5\.00/);

		const salesCall = mockFetch.mock.calls.find(
			([url]) => !String(url).endsWith("/api/rates"),
		) as [string];
		expect(salesCall[0]).toMatch(/\/api\/sales\?startDate=/);
		expect(salesCall[0]).toContain("endDate=");
	});

	it("shows a period summary for the fetched range", async () => {
		mockFetch.mockImplementation((url: string) => {
			if (String(url).endsWith("/api/rates")) {
				return Promise.resolve(jsonResponse(rates));
			}
			return Promise.resolve(jsonResponse([salesLog]));
		});
		render(<GameSales />);
		await screen.findByText(/2 units @ \$5\.00/);

		const summary = screen.getByTestId("sales-range-summary");
		expect(summary).toHaveTextContent("1 sale");
		expect(summary).toHaveTextContent("Total $10.00");
	});

	it("applies a custom range and refetches game sales within it", async () => {
		render(<GameSales />);
		await screen.findByText(/2 units @ \$5\.00/);
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
			screen.getByText("Game sales in the selected range."),
		).toBeInTheDocument();
	});

	it("shows the no-games banner and configures default games", async () => {
		mockFetch.mockImplementation((url: string, init?: RequestInit) => {
			if (init?.method === "POST" && url.endsWith("/api/rates")) {
				const body = JSON.parse(String(init.body || "{}"));
				return Promise.resolve(
					jsonResponse({ id: `rate-new-${Date.now()}`, ...body }),
				);
			}
			if (url.endsWith("/api/rates")) {
				return Promise.resolve(jsonResponse([]));
			}
			return Promise.resolve(jsonResponse([]));
		});
		render(<GameSales />);
		expect(await screen.findByText("No games configured!")).toBeInTheDocument();

		fireEvent.click(
			screen.getByRole("button", { name: "+ Add Default Games" }),
		);

		await waitFor(() =>
			expect(toast.success).toHaveBeenCalledWith("Default games configured!"),
		);
		const posts = mockFetch.mock.calls.filter(
			([url, init]) =>
				(url as string).endsWith("/api/rates") &&
				(init as RequestInit | undefined)?.method === "POST",
		);
		expect(posts).toHaveLength(2);
		expect(
			JSON.parse(String((posts[0] as [string, RequestInit])[1].body)),
		).toMatchObject({
			game_name: "PS4",
			price_per_unit: 5,
		});
		expect(
			JSON.parse(String((posts[1] as [string, RequestInit])[1].body)),
		).toMatchObject({
			game_name: "Pool",
			price_per_unit: 2,
		});
	});

	it("computes the calculated total from rate and quantity", async () => {
		mockFetch.mockImplementation((url: string) => {
			if (url.endsWith("/api/rates")) {
				return Promise.resolve(jsonResponse(rates));
			}
			return Promise.resolve(jsonResponse([]));
		});
		render(<GameSales />);
		await screen.findByRole("option", { name: /PS4/ });

		fireEvent.change(screen.getByLabelText("Game / Table"), {
			target: { value: "rate-1" },
		});
		fireEvent.change(screen.getByLabelText("Quantity (Hours)"), {
			target: { value: "2" },
		});
		expect(screen.getByText("$10.00")).toBeInTheDocument();
	});

	it("logs a new sale via POST with the computed total", async () => {
		mockFetch.mockResolvedValueOnce(jsonResponse(rates));
		mockFetch.mockResolvedValueOnce(jsonResponse([]));
		render(<GameSales />);
		await screen.findByRole("option", { name: /PS4/ });

		fireEvent.change(screen.getByLabelText("Game / Table"), {
			target: { value: "rate-1" },
		});
		fireEvent.change(screen.getByLabelText("Quantity (Hours)"), {
			target: { value: "2" },
		});
		const form = screen.getByText("New Entry").closest("form");
		fireEvent.submit(form as HTMLFormElement);

		await waitFor(() =>
			expect(mockFetch).toHaveBeenCalledWith(
				expect.stringMatching(/\/api\/sales$/),
				expect.objectContaining({ method: "POST" }),
			),
		);
		await waitFor(() =>
			expect(toast.success).toHaveBeenCalledWith(
				"Game sale logged successfully!",
			),
		);
		const [, init] = mockFetch.mock.calls[2] as [string, RequestInit];
		expect(JSON.parse(String(init.body))).toEqual({
			game_id: "rate-1",
			game_name: "PS4",
			quantity_sold: "2",
			rate_applied: 5,
			calculated_total: 10,
			date: expect.any(String),
		});
	});

	it("deletes a sale via DELETE after a reason is provided", async () => {
		render(<GameSales />);
		await screen.findByText(/2 units @ \$5\.00/);
		fireEvent.click(screen.getByRole("button", { name: "" }));

		fireEvent.change(screen.getByPlaceholderText("Reason for deletion..."), {
			target: { value: "Duplicate entry" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Confirm Delete" }));

		await waitFor(() =>
			expect(mockFetch).toHaveBeenCalledWith(
				expect.stringMatching(/\/api\/sales\/sale-1$/),
				expect.objectContaining({ method: "DELETE" }),
			),
		);
		await waitFor(() =>
			expect(toast.success).toHaveBeenCalledWith("Log deleted successfully!"),
		);
	});

	it("edits a sale via PUT when a reason is provided", async () => {
		render(<GameSales />);
		await screen.findByText(/2 units @ \$5\.00/);
		fireEvent.click(screen.getByRole("button", { name: "Edit" }));

		fireEvent.change(screen.getByLabelText("Reason for Edit (Required)"), {
			target: { value: "Typo in quantity" },
		});
		const form = screen.getByText("Update Sale").closest("form");
		fireEvent.submit(form as HTMLFormElement);

		await waitFor(() =>
			expect(mockFetch).toHaveBeenCalledWith(
				expect.stringMatching(/\/api\/sales\/sale-1$/),
				expect.objectContaining({ method: "PUT" }),
			),
		);
		await waitFor(() =>
			expect(toast.success).toHaveBeenCalledWith(
				"Game sale updated successfully!",
			),
		);
	});

	it("shows an error toast when loading fails", async () => {
		mockFetch.mockResolvedValue(jsonResponse({ error: "boom" }, false, 500));
		render(<GameSales />);
		await waitFor(() =>
			expect(toast.error).toHaveBeenCalledWith("Failed to fetch rates"),
		);
	});

	it("shows error toast when POST sale fails", async () => {
		render(<GameSales />);
		await screen.findByText(/2 units @ \$5\.00/);

		fireEvent.change(screen.getByLabelText("Game / Table"), {
			target: { value: "rate-1" },
		});
		fireEvent.change(screen.getByLabelText("Quantity (Hours)"), {
			target: { value: "2" },
		});

		mockFetch.mockImplementationOnce(() => Promise.reject(new Error("fail")));

		const form = screen.getByText("New Entry").closest("form");
		fireEvent.submit(form as HTMLFormElement);

		await waitFor(() => expect(toast.error).toHaveBeenCalledWith("fail"));
	});

	it("shows error toast when PUT sale fails in edit mode", async () => {
		render(<GameSales />);
		await screen.findByText(/2 units @ \$5\.00/);
		fireEvent.click(screen.getByRole("button", { name: "Edit" }));

		fireEvent.change(screen.getByLabelText("Reason for Edit (Required)"), {
			target: { value: "Typo in quantity" },
		});

		mockFetch.mockImplementationOnce(() => Promise.reject(new Error("fail")));

		const form = screen.getByText("Update Sale").closest("form");
		fireEvent.submit(form as HTMLFormElement);

		await waitFor(() => expect(toast.error).toHaveBeenCalledWith("fail"));
	});

	it("shows error toast when Add Default Games fails", async () => {
		mockFetch.mockImplementation((url: string, init?: RequestInit) => {
			if (url.endsWith("/api/rates")) {
				if (init?.method === "POST") {
					const body = JSON.parse(String(init.body || "{}"));
					return Promise.resolve(
						jsonResponse({ id: `rate-new-${Date.now()}`, ...body }),
					);
				}
				return Promise.resolve(jsonResponse([]));
			}
			return Promise.resolve(jsonResponse([]));
		});
		render(<GameSales />);
		await screen.findByText("No games configured!");

		mockFetch.mockImplementationOnce(() => Promise.reject(new Error("fail")));

		fireEvent.click(
			screen.getByRole("button", { name: "+ Add Default Games" }),
		);

		await waitFor(() => expect(toast.error).toHaveBeenCalledWith("fail"));
	});

	it("dismisses delete confirmation when Cancel is clicked", async () => {
		render(<GameSales />);
		await screen.findByText(/2 units @ \$5\.00/);
		fireEvent.click(screen.getByRole("button", { name: "" }));

		expect(
			screen.getByPlaceholderText("Reason for deletion..."),
		).toBeInTheDocument();

		fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

		expect(
			screen.queryByPlaceholderText("Reason for deletion..."),
		).not.toBeInTheDocument();
	});

	it("shows error toast when delete sale fails", async () => {
		render(<GameSales />);
		await screen.findByText(/2 units @ \$5\.00/);
		fireEvent.click(screen.getByRole("button", { name: "" }));

		fireEvent.change(screen.getByPlaceholderText("Reason for deletion..."), {
			target: { value: "Wrong entry" },
		});

		mockFetch.mockImplementationOnce(() => Promise.reject(new Error("fail")));

		fireEvent.click(screen.getByRole("button", { name: "Confirm Delete" }));

		await waitFor(() => expect(toast.error).toHaveBeenCalledWith("fail"));
	});

	it("refetches sales data when the tab becomes visible again", async () => {
		render(<GameSales />);
		await waitFor(() => expect(mockFetch).toHaveBeenCalled());

		const callsBefore = mockFetch.mock.calls.length;
		document.dispatchEvent(new Event("visibilitychange"));

		await waitFor(() => {
			expect(mockFetch.mock.calls.length).toBeGreaterThan(callsBefore);
		});
	});

	describe("day grouping + pagination (M-71)", () => {
		const day1 = new Date("2026-08-21T18:42:00").toISOString(); // Fri
		const day2 = new Date("2026-08-20T09:15:00").toISOString(); // Thu
		const sixSales = [1, 2, 3, 4, 5].map((n) => ({
			...salesLog,
			id: `sale-${n}`,
			date: day1,
			quantity_sold: n,
			calculated_total: n * 5,
		}));
		sixSales.push({
			...salesLog,
			id: "sale-6",
			date: day2,
			quantity_sold: 9,
			calculated_total: 45,
		});

		it("shows pager only beyond page size and navigates with bounds", async () => {
			mockFetch.mockImplementation(() =>
				Promise.resolve(jsonResponse(sixSales)),
			);
			render(<GameSales />);
			await screen.findByText(/4 units @ \$5\.00/);
			expect(screen.queryByText(/9 units @ \$5\.00/)).not.toBeInTheDocument();
			expect(screen.getByText("Page 1 of 2")).toBeInTheDocument();
			const prev = screen.getByRole("button", { name: "Previous" });
			const next = screen.getByRole("button", { name: "Next" });
			expect(prev).toBeDisabled();

			fireEvent.click(next);
			expect(await screen.findByText(/9 units @ \$5\.00/)).toBeInTheDocument();
			expect(screen.getByText("Page 2 of 2")).toBeInTheDocument();
			expect(next).toBeDisabled();
			expect(prev).toBeEnabled();

			fireEvent.click(prev);
			expect(await screen.findByText("Page 1 of 2")).toBeInTheDocument();
		});

		it("renders weekday day headers and no per-day totals", async () => {
			mockFetch.mockImplementation(() =>
				Promise.resolve(jsonResponse(sixSales)),
			);
			render(<GameSales />);
			const header = await screen.findByText(/Fri, Aug 21/);
			expect(header).toBeInTheDocument();
			expect(
				screen.queryByTestId(/sales-day-subtotal-/),
			).not.toBeInTheDocument();
		});

		it("resets to page 1 when the range is refetched", async () => {
			mockFetch.mockImplementation(() =>
				Promise.resolve(jsonResponse(sixSales)),
			);
			render(<GameSales />);
			await screen.findByText("Page 1 of 2");
			fireEvent.click(screen.getByRole("button", { name: "Next" }));
			expect(await screen.findByText("Page 2 of 2")).toBeInTheDocument();

			fireEvent.click(screen.getByRole("button", { name: "Apply" }));
			expect(await screen.findByText("Page 1 of 2")).toBeInTheDocument();
		});

		it("promotes a single period-total banner for the selected range", async () => {
			mockFetch.mockImplementation(() =>
				Promise.resolve(jsonResponse(sixSales)),
			);
			render(<GameSales />);
			const banner = await screen.findByTestId("sales-range-summary");
			expect(banner).toHaveTextContent("6 sales");
			expect(banner).toHaveTextContent("Total $120.00");
		});
	});

	it("TD-047: blocks Apply with hint when From is after To, Today resets", async () => {
		mockFetch.mockImplementation((url: string) => {
			if (String(url).endsWith("/api/rates")) {
				return Promise.resolve(jsonResponse(rates));
			}
			return Promise.resolve(jsonResponse([salesLog]));
		});
		render(<GameSales />);
		await screen.findByTestId("sales-range-summary");

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
	});

	it("TD-048: shows in-flight state on Apply until the fetch resolves", async () => {
		let resolveFetch: (v: Response) => void = () => {};
		const deferred = new Promise<Response>((r) => {
			resolveFetch = r;
		});
		mockFetch.mockImplementation((url: string) => {
			if (String(url).endsWith("/api/rates")) {
				return Promise.resolve(jsonResponse(rates));
			}
			return deferred;
		});

		render(<GameSales />);
		const apply = screen.getByRole("button", { name: "Apply" });
		expect(apply).toBeDisabled();
		expect(screen.getByTestId("history-loading")).toBeInTheDocument();

		resolveFetch(jsonResponse([salesLog]));
		await screen.findByTestId("sales-range-summary");
		expect(apply).toBeEnabled();
		expect(screen.queryByTestId("history-loading")).not.toBeInTheDocument();
	});
});
