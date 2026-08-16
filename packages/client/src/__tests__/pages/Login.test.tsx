/**
 * @vitest-environment jsdom
 */
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { signInWithPopup, signInWithRedirect } from "firebase/auth";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Login } from "../../pages/Login.js";

vi.mock("firebase/auth", () => ({
	signInWithPopup: vi.fn(),
	signInWithRedirect: vi.fn(),
}));

vi.mock("../../firebase", () => ({
	auth: {},
	googleProvider: {},
}));

beforeEach(() => {
	vi.clearAllMocks();
});

describe("Login", () => {
	it("renders the sign-in card", () => {
		render(<Login />);
		expect(screen.getByText("Game Zone Manager")).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Sign in with Google" }),
		).toBeInTheDocument();
	});

	it("signs in via popup when the button is clicked", async () => {
		vi.mocked(signInWithPopup).mockResolvedValue({} as never);
		render(<Login />);
		fireEvent.click(
			screen.getByRole("button", { name: "Sign in with Google" }),
		);
		await waitFor(() => expect(signInWithPopup).toHaveBeenCalled());
		expect(signInWithRedirect).not.toHaveBeenCalled();
	});

	it("falls back to redirect when the popup is blocked", async () => {
		vi.mocked(signInWithPopup).mockRejectedValue({
			code: "auth/popup-blocked",
		});
		vi.mocked(signInWithRedirect).mockResolvedValue({} as never);
		render(<Login />);
		fireEvent.click(
			screen.getByRole("button", { name: "Sign in with Google" }),
		);
		await waitFor(() => expect(signInWithRedirect).toHaveBeenCalled());
		expect(screen.queryByText("Login failed")).not.toBeInTheDocument();
	});

	it("surfaces the error message when popup login fails", async () => {
		vi.mocked(signInWithPopup).mockRejectedValue({
			code: "auth/popup-cancelled",
			message: "Login failed",
		});
		render(<Login />);
		fireEvent.click(
			screen.getByRole("button", { name: "Sign in with Google" }),
		);
		await waitFor(() =>
			expect(screen.getByText("Login failed")).toBeInTheDocument(),
		);
	});

	it("surfaces the redirect error message when the redirect fallback fails", async () => {
		vi.mocked(signInWithPopup).mockRejectedValue({
			code: "auth/popup-blocked",
		});
		vi.mocked(signInWithRedirect).mockRejectedValue({
			message: "Redirect failed",
		});
		render(<Login />);
		fireEvent.click(
			screen.getByRole("button", { name: "Sign in with Google" }),
		);
		await waitFor(() =>
			expect(screen.getByText("Redirect failed")).toBeInTheDocument(),
		);
	});
});
