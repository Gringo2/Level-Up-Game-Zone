/**
 * @vitest-environment jsdom
 */
import "@testing-library/jest-dom/vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useAuth } from "../../contexts/AuthContext.js";
import { ShiftProvider, useShift } from "../../contexts/ShiftContext.js";

// Mock Firebase Modules
vi.mock("firebase/firestore", () => ({
	collection: vi.fn(),
	query: vi.fn(),
	where: vi.fn(),
	orderBy: vi.fn(),
	onSnapshot: vi.fn((_q, _onNext, onError) => {
		// Simulate a firestore permission error
		onError(new Error("Missing or insufficient permissions."));
		return vi.fn();
	}),
}));

vi.mock("../../firebase", () => ({
	db: {},
}));

vi.mock("../../contexts/AuthContext.js", () => ({
	useAuth: vi.fn(),
}));

// Test Component
const TestComponent = () => {
	const { activeShift, loadingShift } = useShift();
	if (loadingShift) return <div data-testid="loading">Loading...</div>;
	if (!activeShift) return <div data-testid="no-shift">No Shift</div>;
	return <div data-testid="shift">{activeShift.id}</div>;
};

describe("ShiftContext - Negative Tests", () => {
	it("should gracefully handle firestore errors and stop loading", async () => {
		// Mock an active user so ShiftContext attempts to fetch
		vi.mocked(useAuth).mockReturnValue({
			user: { uid: "123", role: "manager" } as unknown,
			loading: false,
		});

		render(
			<ShiftProvider>
				<TestComponent />
			</ShiftProvider>,
		);

		// It should initially render Loading..., but then the error handler should clear loading
		// and leave activeShift as null.
		await waitFor(() => {
			expect(screen.getByTestId("no-shift")).toBeInTheDocument();
		});
	});
});
