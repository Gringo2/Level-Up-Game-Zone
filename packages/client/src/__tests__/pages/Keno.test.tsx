/**
 * @vitest-environment jsdom
 */
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuth } from "../../contexts/AuthContext.js";
import { Keno } from "../../pages/Keno.js";

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
				return Promise.resolve(jsonResponse({ ok: true }));
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
		await waitFor(() =>
			expect(toast.error).toHaveBeenCalledWith("Failed to load keno logs"),
		);
	});

	it("logs a new keno entry via POST with computed net profit", async () => {
		mockFetch.mockResolvedValueOnce(jsonResponse([kenoLog]));
		render(<Keno />);
		await screen.findByText("Net: $60.00");

		fireEvent.change(screen.getByLabelText("Total Sales ($)"), {
			target: { value: "100" },
		});
		fireEvent.change(screen.getByLabelText("Total Payouts ($)"), {
			target: { value: "40" },
		});
		expect(screen.getByText("$60.00")).toBeInTheDocument();

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
			sales: "100",
			payouts: "40",
			net_profit: 60,
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
		fireEvent.change(screen.getByLabelText("Total Payouts ($)"), {
			target: { value: "45" },
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

		fireEvent.change(screen.getByLabelText("Total Sales ($)"), {
			target: { value: "100" },
		});
		fireEvent.change(screen.getByLabelText("Total Payouts ($)"), {
			target: { value: "40" },
		});
		const form = screen.getByText("Daily Keno Entry").closest("form");
		fireEvent.submit(form as HTMLFormElement);

		await waitFor(() =>
			expect(toast.error).toHaveBeenCalledWith("Failed to save keno log"),
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
			expect(toast.error).toHaveBeenCalledWith("Failed to save keno log"),
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
			expect(toast.error).toHaveBeenCalledWith("Failed to delete keno log"),
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
			expect(toast.error).toHaveBeenCalledWith("Failed to verify keno log"),
		);
	});
});
