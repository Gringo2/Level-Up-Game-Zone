/**
 * @vitest-environment jsdom
 */
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Admin } from "../../pages/Admin.js";

vi.mock("../../firebase", () => ({
	auth: {
		currentUser: { getIdToken: vi.fn().mockResolvedValue("mock-token") },
	},
}));

vi.mock("sonner", () => ({
	toast: { error: vi.fn(), success: vi.fn() },
}));

const jsonResponse = (data: unknown, ok = true, status = 200) =>
	new Response(JSON.stringify(data), {
		status,
		statusText: ok ? "OK" : "Internal Server Error",
		headers: { "Content-Type": "application/json" },
	});

const rate = {
	id: "r1",
	game_name: "PS4",
	price_per_unit: 5,
	unit_type: "Hour" as const,
	isActive: true,
};

const rate2 = {
	id: "r2",
	game_name: "Pool",
	price_per_unit: 2,
	unit_type: "Game" as const,
	isActive: false,
};

const rates = [rate, rate2];

describe("Admin", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		window.scrollTo = vi.fn();
	});

	it("loads and displays rates", async () => {
		vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(rates)));

		render(<Admin />);

		await waitFor(() => {
			expect(screen.getByText("PS4")).toBeDefined();
		});
		expect(screen.getByText("Pool")).toBeDefined();
		expect(screen.getByText("$5.00 / Hour")).toBeDefined();
		expect(screen.getByText("$2.00 / Game")).toBeDefined();
	});

	it("shows empty state when no rates exist", async () => {
		vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse([])));

		render(<Admin />);

		await waitFor(() => {
			expect(screen.getByText("No rates defined yet.")).toBeDefined();
		});
	});

	it("toasts error when load fails", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue(jsonResponse(null, false, 500)),
		);

		render(<Admin />);

		await waitFor(() => {
			expect(toast.error).toHaveBeenCalledWith("Failed to load rates");
		});
	});

	it("adds a new rate via POST", async () => {
		const newRate = {
			id: "r3",
			game_name: "Darts",
			price_per_unit: 3,
			unit_type: "Game" as const,
			isActive: true,
		};

		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(jsonResponse(rates))
			.mockResolvedValueOnce(jsonResponse(newRate));

		vi.stubGlobal("fetch", fetchMock);

		render(<Admin />);

		await waitFor(() => {
			expect(screen.getByText("PS4")).toBeDefined();
		});

		fireEvent.change(screen.getByLabelText("Game Name"), {
			target: { value: "Darts" },
		});
		fireEvent.change(screen.getByLabelText("Price ($)"), {
			target: { value: "3" },
		});
		fireEvent.click(screen.getByText("Add Rate"));

		await waitFor(() => {
			expect(fetchMock).toHaveBeenCalledWith(
				expect.stringContaining("/api/rates"),
				expect.objectContaining({ method: "POST" }),
			);
		});
		expect(toast.success).toHaveBeenCalledWith("Game rate added successfully!");
	});

	it("does not POST when game name or price is empty", async () => {
		const fetchMock = vi.fn().mockResolvedValue(jsonResponse(rates));
		vi.stubGlobal("fetch", fetchMock);

		render(<Admin />);

		await waitFor(() => {
			expect(screen.getByText("PS4")).toBeDefined();
		});

		fireEvent.click(screen.getByText("Add Rate"));

		await waitFor(() => {
			expect(fetchMock).toHaveBeenCalledTimes(1);
		});
	});

	it("starts inline edit on Edit button click", async () => {
		vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(rates)));

		render(<Admin />);

		await waitFor(() => {
			expect(screen.getByText("PS4")).toBeDefined();
		});

		const editButtons = screen.getAllByText("Edit");
		fireEvent.click(editButtons[0]);

		expect(screen.getByDisplayValue("PS4")).toBeDefined();
		expect(screen.getByDisplayValue("5")).toBeDefined();
		expect(screen.getByText("Save Changes")).toBeDefined();
	});

	it("edits a rate via PUT with reason", async () => {
		const updatedRate = { ...rate, game_name: "PS5", price_per_unit: 8 };

		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(jsonResponse(rates))
			.mockResolvedValueOnce(jsonResponse(updatedRate));

		vi.stubGlobal("fetch", fetchMock);

		render(<Admin />);

		await waitFor(() => {
			expect(screen.getByText("PS4")).toBeDefined();
		});

		const editButtons = screen.getAllByText("Edit");
		fireEvent.click(editButtons[0]);

		const nameInput = screen.getByDisplayValue("PS4");
		fireEvent.change(nameInput, { target: { value: "PS5" } });

		const priceInput = screen.getByDisplayValue("5");
		fireEvent.change(priceInput, { target: { value: "8" } });

		const reasonInput = screen.getByPlaceholderText(/Price increase/);
		fireEvent.change(reasonInput, { target: { value: "Updated pricing" } });

		fireEvent.click(screen.getByText("Save Changes"));

		await waitFor(() => {
			expect(fetchMock).toHaveBeenCalledWith(
				expect.stringContaining("/api/rates/r1"),
				expect.objectContaining({ method: "PUT" }),
			);
		});
		expect(toast.success).toHaveBeenCalledWith("Rate updated successfully!");
	});

	it("disables Save Changes when edit reason is empty", async () => {
		vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(rates)));

		render(<Admin />);

		await waitFor(() => {
			expect(screen.getByText("PS4")).toBeDefined();
		});

		const editButtons = screen.getAllByText("Edit");
		fireEvent.click(editButtons[0]);

		const saveBtn = screen.getByText("Save Changes");
		expect(saveBtn.closest("button")).toHaveProperty("disabled", true);

		const reasonInput = screen.getByPlaceholderText(/Price increase/);
		fireEvent.change(reasonInput, { target: { value: "Valid reason" } });
		expect(
			screen.getByText("Save Changes").closest("button"),
		).not.toHaveProperty("disabled", true);
	});

	it("toggles rate active status via PUT", async () => {
		const deactivatedRate = { ...rate, isActive: false };

		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(jsonResponse(rates))
			.mockResolvedValueOnce(jsonResponse(deactivatedRate));

		vi.stubGlobal("fetch", fetchMock);

		render(<Admin />);

		await waitFor(() => {
			expect(screen.getByText("PS4")).toBeDefined();
		});

		fireEvent.click(screen.getByText("Deactivate"));

		await waitFor(() => {
			expect(fetchMock).toHaveBeenCalledWith(
				expect.stringContaining("/api/rates/r1"),
				expect.objectContaining({ method: "PUT" }),
			);
		});
		expect(toast.success).toHaveBeenCalledWith("Rate deactivated");
	});

	it("cancels edit without saving", async () => {
		vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(rates)));

		render(<Admin />);

		await waitFor(() => {
			expect(screen.getByText("PS4")).toBeDefined();
		});

		const editButtons = screen.getAllByText("Edit");
		fireEvent.click(editButtons[0]);
		expect(screen.getByDisplayValue("PS4")).toBeDefined();

		fireEvent.click(screen.getByText("Cancel"));

		await waitFor(() => {
			expect(screen.queryByDisplayValue("PS4")).toBeNull();
		});
	});
});
