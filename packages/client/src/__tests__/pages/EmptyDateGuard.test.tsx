/**
 * @vitest-environment jsdom
 */
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuth } from "../../contexts/AuthContext.js";
import { Credits } from "../../pages/Credits.js";
import { Expenses } from "../../pages/Expenses.js";
import { GameSales } from "../../pages/GameSales.js";
import { Keno } from "../../pages/Keno.js";
import { SportsBetting } from "../../pages/SportsBetting.js";

// M-133 / TD-069: clearing the Date field used to throw inside the submit
// handler and fail silently. It must now say what is wrong and send nothing.
vi.mock("../../firebase", () => ({
	auth: {
		currentUser: { getIdToken: vi.fn().mockResolvedValue("mock-token") },
	},
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock("../../contexts/AuthContext.js", () => ({ useAuth: vi.fn() }));

const jsonResponse = (data: unknown) =>
	new Response(JSON.stringify(data), {
		status: 200,
		headers: { "Content-Type": "application/json" },
	});
const mockFetch = vi.fn();

const pages: Array<[string, () => React.ReactElement]> = [
	["Game Sales", () => <GameSales />],
	["Keno", () => <Keno />],
	["Sports Betting", () => <SportsBetting />],
	["Expenses", () => <Expenses />],
	["Credits", () => <Credits />],
];

describe("empty Date field (TD-069)", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		window.scrollTo = vi.fn();
		vi.mocked(useAuth).mockReturnValue({
			user: {
				uid: "u1",
				email: "m@x.test",
				displayName: "Manager",
				role: "manager",
			},
			loading: false,
		});
		mockFetch.mockImplementation(() => Promise.resolve(jsonResponse([])));
		global.fetch = mockFetch as unknown as typeof fetch;
	});

	it.each(pages)(
		"%s: shows a message and sends nothing",
		async (_name, page) => {
			render(page());
			const date = await screen.findByLabelText("Date");
			await waitFor(() => expect(mockFetch).toHaveBeenCalled());
			const callsBefore = mockFetch.mock.calls.length;

			fireEvent.change(date, { target: { value: "" } });
			fireEvent.submit(date.closest("form") as HTMLFormElement);

			expect(toast.error).toHaveBeenCalledWith("Please choose a date.");
			expect(mockFetch.mock.calls.length).toBe(callsBefore);
		},
	);
});
