/**
 * @vitest-environment jsdom
 */
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuth } from "../../contexts/AuthContext.js";
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
				return Promise.resolve(jsonResponse({ ok: true }));
			}
			if (init?.method === "POST" && url.endsWith("/api/rates")) {
				return Promise.resolve(jsonResponse({ ok: true }));
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

	it("shows the no-games banner and configures default games", async () => {
		mockFetch.mockImplementation((url: string) => {
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
		fireEvent.click(screen.getByRole("button", { name: "Confirm" }));

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
			expect(toast.error).toHaveBeenCalledWith("Failed to load sales data"),
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

		await waitFor(() =>
			expect(toast.error).toHaveBeenCalledWith("Failed to save sale"),
		);
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

		await waitFor(() =>
			expect(toast.error).toHaveBeenCalledWith("Failed to save sale"),
		);
	});

	it("shows error toast when Add Default Games fails", async () => {
		mockFetch.mockImplementation((url: string) => {
			if (url.endsWith("/api/rates")) {
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

		await waitFor(() =>
			expect(toast.error).toHaveBeenCalledWith("Failed to configure games"),
		);
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

		fireEvent.click(screen.getByRole("button", { name: "Confirm" }));

		await waitFor(() =>
			expect(toast.error).toHaveBeenCalledWith("Failed to delete sale"),
		);
	});
});
