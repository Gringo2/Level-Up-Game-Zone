/**
 * @vitest-environment jsdom
 */
import "@testing-library/jest-dom/vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuth } from "../../contexts/AuthContext.js";
import { ShiftProvider, useShift } from "../../contexts/ShiftContext.js";

vi.mock("../../firebase", () => ({
	auth: {
		currentUser: { getIdToken: vi.fn().mockResolvedValue("mock-token") },
	},
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
	it("should gracefully handle API errors and stop loading", async () => {
		global.fetch = vi.fn().mockResolvedValue({
			ok: false,
			status: 500,
			statusText: "Internal Server Error",
		});
		// Mock an active user so ShiftContext attempts to fetch
		vi.mocked(useAuth).mockReturnValue({
			user: {
				uid: "123",
				email: "manager@example.com",
				displayName: "Manager",
				role: "manager",
			},
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

describe("ShiftContext - Positive Tests", () => {
	beforeEach(() => {
		vi.mocked(useAuth).mockReturnValue({
			user: {
				uid: "123",
				email: "manager@example.com",
				displayName: "Manager",
				role: "manager",
			},
			loading: false,
		});
	});

	it("selects the most recently opened OPEN shift", async () => {
		global.fetch = vi.fn().mockImplementation((url: string) => {
			if (url.includes("/missed")) {
				return Promise.resolve(
					new Response(JSON.stringify({ missedShifts: [], gapDates: [] }), {
						status: 200,
						statusText: "OK",
						headers: { "Content-Type": "application/json" },
					}),
				);
			}
			return Promise.resolve(
				new Response(
					JSON.stringify([
						{
							id: "old",
							status: "OPEN",
							start_time: "2026-01-01T09:00:00.000Z",
						},
						{
							id: "new",
							status: "OPEN",
							start_time: "2026-01-02T09:00:00.000Z",
						},
					]),
					{
						status: 200,
						statusText: "OK",
						headers: { "Content-Type": "application/json" },
					},
				),
			);
		});

		render(
			<ShiftProvider>
				<TestComponent />
			</ShiftProvider>,
		);

		await waitFor(() => {
			expect(screen.getByTestId("shift")).toHaveTextContent("new");
		});
	});

	it("overrides the open shift with newlyOpenedShift when present", async () => {
		global.fetch = vi.fn().mockImplementation((url: string) => {
			if (url.includes("/missed")) {
				return Promise.resolve(
					new Response(
						JSON.stringify({
							missedShifts: [],
							gapDates: [],
							newlyOpenedShift: {
								id: "override",
								status: "OPEN",
								start_time: "2026-01-03T09:00:00.000Z",
							},
						}),
						{
							status: 200,
							statusText: "OK",
							headers: { "Content-Type": "application/json" },
						},
					),
				);
			}
			return Promise.resolve(
				new Response(
					JSON.stringify([
						{
							id: "new",
							status: "OPEN",
							start_time: "2026-01-02T09:00:00.000Z",
						},
					]),
					{
						status: 200,
						statusText: "OK",
						headers: { "Content-Type": "application/json" },
					},
				),
			);
		});

		render(
			<ShiftProvider>
				<TestComponent />
			</ShiftProvider>,
		);

		await waitFor(() => {
			expect(screen.getByTestId("shift")).toHaveTextContent("override");
		});
	});

	it("clears the active shift when no OPEN shift exists", async () => {
		global.fetch = vi.fn().mockImplementation((url: string) => {
			if (url.includes("/missed")) {
				return Promise.resolve(
					new Response(
						JSON.stringify({ missedShifts: [], gapDates: ["2026-01-05"] }),
						{
							status: 200,
							statusText: "OK",
							headers: { "Content-Type": "application/json" },
						},
					),
				);
			}
			return Promise.resolve(
				new Response(JSON.stringify([]), {
					status: 200,
					statusText: "OK",
					headers: { "Content-Type": "application/json" },
				}),
			);
		});

		render(
			<ShiftProvider>
				<TestComponent />
			</ShiftProvider>,
		);

		await waitFor(() => {
			expect(screen.getByTestId("no-shift")).toBeInTheDocument();
		});
	});
});
