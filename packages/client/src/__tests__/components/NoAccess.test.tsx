/**
 * @vitest-environment jsdom
 */
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { signOut } from "firebase/auth";
import { describe, expect, it, vi } from "vitest";
import { NoAccess } from "../../components/NoAccess";

vi.mock("firebase/auth", () => ({ signOut: vi.fn() }));
vi.mock("../../firebase", () => ({ auth: {} }));

describe("NoAccess", () => {
	it("names the account and signs out on click", () => {
		render(<NoAccess email="staff@example.com" />);
		expect(
			screen.getByText(/staff@example\.com is not a manager or admin account/),
		).toBeInTheDocument();
		fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
		expect(signOut).toHaveBeenCalled();
	});

	it("falls back to generic wording without an email", () => {
		render(<NoAccess />);
		expect(
			screen.getByText(/This account is not a manager or admin account/),
		).toBeInTheDocument();
	});
});
