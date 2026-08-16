/**
 * @vitest-environment jsdom
 */
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ErrorBoundary } from "../../components/ErrorBoundary.js";

function Bomb({ message }: { message: string }): ReactNode {
	throw new Error(message);
}

describe("ErrorBoundary", () => {
	const reloadSpy = vi.fn();
	const originalLocation = Object.getOwnPropertyDescriptor(window, "location");
	let consoleSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		Object.defineProperty(window, "location", {
			configurable: true,
			value: { reload: reloadSpy },
		});
		consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
	});

	afterEach(() => {
		// Restore the original location descriptor so no DOM state leaks to
		// subsequent tests (review observation #3).
		if (originalLocation) {
			Object.defineProperty(window, "location", originalLocation);
		}
		consoleSpy.mockRestore();
		reloadSpy.mockClear();
	});

	it("renders children when no error occurs", () => {
		render(
			<ErrorBoundary>
				<div>Safe content</div>
			</ErrorBoundary>,
		);
		expect(screen.getByText("Safe content")).toBeInTheDocument();
	});

	it("renders the fallback UI with the error message when a child throws", () => {
		render(
			<ErrorBoundary>
				<Bomb message="boom" />
			</ErrorBoundary>,
		);
		expect(screen.getByText("Something went wrong")).toBeInTheDocument();
		expect(screen.getByText("boom")).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Reload Application" }),
		).toBeInTheDocument();
	});

	it("reloads the application when the reload button is clicked", () => {
		render(
			<ErrorBoundary>
				<Bomb message="boom" />
			</ErrorBoundary>,
		);
		fireEvent.click(screen.getByRole("button", { name: "Reload Application" }));
		expect(reloadSpy).toHaveBeenCalled();
	});
});
