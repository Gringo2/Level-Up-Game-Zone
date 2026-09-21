/**
 * @vitest-environment jsdom
 */
import "@testing-library/jest-dom/vitest";
import {
	act,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
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

	it("disables the button while sign-in is in flight to prevent double-click races", async () => {
		let resolveSignIn: () => void;
		const signInPromise = new Promise((resolve) => {
			resolveSignIn = resolve as () => void;
		});
		vi.mocked(signInWithPopup).mockReturnValue(signInPromise as never);

		render(<Login />);
		const button = screen.getByRole("button", { name: "Sign in with Google" });
		expect(button).not.toBeDisabled();

		fireEvent.click(button);

		// Button should immediately be disabled with submitting state
		expect(button).toBeDisabled();
		expect(screen.getByText("Signing in…")).toBeInTheDocument();

		await act(async () => {
			resolveSignIn?.();
		});
		expect(button).not.toBeDisabled();
	});

	it("re-enables the button after sign-in fails", async () => {
		vi.mocked(signInWithPopup).mockRejectedValue({
			code: "auth/popup-cancelled",
			message: "Cancelled",
		});

		render(<Login />);
		const button = screen.getByRole("button", { name: "Sign in with Google" });
		fireEvent.click(button);

		await waitFor(() =>
			expect(screen.getByText("Cancelled")).toBeInTheDocument(),
		);
		expect(button).not.toBeDisabled();
		expect(
			screen.getByRole("button", { name: "Sign in with Google" }),
		).toBeInTheDocument();
	});
});
