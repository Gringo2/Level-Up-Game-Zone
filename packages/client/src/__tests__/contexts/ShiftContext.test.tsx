/**
 * @vitest-environment jsdom
 */
import "@testing-library/jest-dom/vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuth } from "../../contexts/AuthContext.js";
import { ShiftProvider, useShift } from "../../contexts/ShiftContext.js";

const { mockGetIdToken } = vi.hoisted(() => ({
	mockGetIdToken: vi
		.fn<() => Promise<string | null>>()
		.mockResolvedValue("mock-token"),
}));

vi.mock("../../firebase", () => ({
	auth: {
		currentUser: { getIdToken: mockGetIdToken },
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

	it("ignores any legacy newlyOpenedShift field in /missed response (ACP-011)", async () => {
		// Verifies that even if a /missed response contains a newlyOpenedShift field
		// (e.g., from a stale server version), the ShiftContext does NOT use it —
		// the active shift is sourced only from GET /api/shifts.
		global.fetch = vi.fn().mockImplementation((url: string) => {
			if (url.includes("/missed")) {
				return Promise.resolve(
					new Response(
						JSON.stringify({
							missedShifts: [],
							gapDates: [],
							// legacy field — must be ignored by the updated ShiftContext
							newlyOpenedShift: {
								id: "legacy-override",
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
							id: "from-list",
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
			// Must come from the shifts list, not from the legacy newlyOpenedShift field
			expect(screen.getByTestId("shift")).toHaveTextContent("from-list");
		});
	});

	it("clears the active shift when no OPEN shift exists and gaps block auto-open", async () => {
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
		// Verify auto-open was NOT called — gaps block the guard.
		const fetchMock = global.fetch as ReturnType<typeof vi.fn>;
		const autoOpenCalls = fetchMock.mock.calls.filter((c: unknown[]) =>
			String(c[0]).includes("/auto-open"),
		);
		expect(autoOpenCalls).toHaveLength(0);
	});

	it("calls auto-open and sets the shift when state is clean (OQ-1 Option B)", async () => {
		global.fetch = vi.fn().mockImplementation((url: string) => {
			if (url.includes("/auto-open")) {
				return Promise.resolve(
					new Response(
						JSON.stringify({
							id: "auto-opened-001",
							status: "OPEN",
							start_time: "2026-01-03T09:00:00.000Z",
							opening_float: 0,
							manager_id: "uid-123",
							manager_name: "Manager",
						}),
						{
							status: 201,
							statusText: "Created",
							headers: { "Content-Type": "application/json" },
						},
					),
				);
			}
			if (url.includes("/missed")) {
				return Promise.resolve(
					new Response(JSON.stringify({ missedShifts: [], gapDates: [] }), {
						status: 200,
						statusText: "OK",
						headers: { "Content-Type": "application/json" },
					}),
				);
			}
			// GET /api/shifts — no open shift
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
			expect(screen.getByTestId("shift")).toHaveTextContent("auto-opened-001");
		});
	});

	it("does not set shift when auto-open returns 409 (already open or closed today)", async () => {
		global.fetch = vi.fn().mockImplementation((url: string) => {
			if (url.includes("/auto-open")) {
				return Promise.resolve(
					new Response(
						JSON.stringify({ error: "An active shift is already open." }),
						{
							status: 409,
							statusText: "Conflict",
							headers: { "Content-Type": "application/json" },
						},
					),
				);
			}
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
			// 409 is silently ignored — no shift, no crash
			expect(screen.getByTestId("no-shift")).toBeInTheDocument();
		});
	});
});

describe("ShiftContext - Auth Edge Cases", () => {
	beforeEach(() => {
		mockGetIdToken.mockResolvedValue("mock-token");
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

	it("clears the shift state without fetching when no user is signed in", async () => {
		vi.mocked(useAuth).mockReturnValue({ user: null, loading: false });
		const fetchMock = vi.fn();
		vi.stubGlobal("fetch", fetchMock);

		render(
			<ShiftProvider>
				<TestComponent />
			</ShiftProvider>,
		);

		await waitFor(() => {
			expect(screen.getByTestId("no-shift")).toBeInTheDocument();
		});
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("fails closed when the auth token cannot be obtained", async () => {
		mockGetIdToken.mockResolvedValue(null);
		const fetchMock = vi.fn();
		vi.stubGlobal("fetch", fetchMock);

		render(
			<ShiftProvider>
				<TestComponent />
			</ShiftProvider>,
		);

		await waitFor(() => {
			expect(screen.getByTestId("no-shift")).toBeInTheDocument();
		});
		expect(fetchMock).not.toHaveBeenCalled();
	});
});

describe("ShiftContext - skipAutoOpen (refetchShift path)", () => {
	beforeEach(() => {
		mockGetIdToken.mockResolvedValue("mock-token");
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

	// Component that exposes refetchShift via a button so tests can trigger it.
	const RefetchComponent = () => {
		const { activeShift, loadingShift, refetchShift } = useShift();
		if (loadingShift) return <div data-testid="loading">Loading...</div>;
		return (
			<>
				<div data-testid="shift-id">{activeShift?.id ?? "none"}</div>
				<button
					type="button"
					data-testid="refetch-btn"
					onClick={() => void refetchShift()}
				>
					Refetch
				</button>
			</>
		);
	};

	it("refetchShift does NOT call /auto-open even when state is clean", async () => {
		// Initial mount: GET /api/shifts returns an OPEN shift so auto-open guard is skipped.
		// After refetch: GET /api/shifts returns nothing (shift closed), state is clean —
		// auto-open must NOT fire because refetchShift passes skipAutoOpen=true.
		let callCount = 0;
		global.fetch = vi.fn().mockImplementation((url: string) => {
			if (url.includes("/auto-open")) {
				return Promise.resolve(
					new Response(
						JSON.stringify({ id: "should-never-appear", status: "OPEN" }),
						{
							status: 201,
							statusText: "Created",
							headers: { "Content-Type": "application/json" },
						},
					),
				);
			}
			if (url.includes("/missed")) {
				return Promise.resolve(
					new Response(JSON.stringify({ missedShifts: [], gapDates: [] }), {
						status: 200,
						statusText: "OK",
						headers: { "Content-Type": "application/json" },
					}),
				);
			}
			// First call: return an open shift. Subsequent calls: return empty (shift closed).
			callCount++;
			const shifts =
				callCount === 1
					? [
							{
								id: "existing-shift",
								status: "OPEN",
								start_time: "2026-01-01T08:00:00Z",
							},
						]
					: [];
			return Promise.resolve(
				new Response(JSON.stringify(shifts), {
					status: 200,
					statusText: "OK",
					headers: { "Content-Type": "application/json" },
				}),
			);
		});

		const { getByTestId } = render(
			<ShiftProvider>
				<RefetchComponent />
			</ShiftProvider>,
		);

		// Initial mount: existing-shift is active, auto-open guard skipped (shift exists).
		await waitFor(() => {
			expect(getByTestId("shift-id")).toHaveTextContent("existing-shift");
		});

		// Simulate explicit refetch (as Dashboard does after closeShift).
		getByTestId("refetch-btn").click();

		// After refetch: no shift, and /auto-open must NOT have been called.
		await waitFor(() => {
			expect(getByTestId("shift-id")).toHaveTextContent("none");
		});

		const fetchMock = global.fetch as ReturnType<typeof vi.fn>;
		const autoOpenCalls = fetchMock.mock.calls.filter((c: unknown[]) =>
			String(c[0]).includes("/auto-open"),
		);
		expect(autoOpenCalls).toHaveLength(0);
	});
});
