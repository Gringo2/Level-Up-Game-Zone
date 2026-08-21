/**
 * @vitest-environment jsdom
 */
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuditLogs } from "../../pages/AuditLogs.js";

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

const createLog = {
	id: "log-1",
	table_affected: "game_sales",
	record_id: "r1",
	old_value: null,
	new_value: { quantity_sold: 2 },
	reason_for_change: "Initial entry",
	user_id: "0123456789",
	timestamp: new Date().toISOString(),
};

const updateLog = {
	id: "log-2",
	table_affected: "users",
	record_id: "r2",
	old_value: { role: "staff" },
	new_value: { role: "manager" },
	reason_for_change: "Promotion",
	user_id: "ABCDEFGHIJ",
	timestamp: new Date().toISOString(),
};

const deleteLog = {
	id: "log-3",
	table_affected: "keno_tickets",
	record_id: "r3",
	old_value: { sales: 100 },
	new_value: null,
	reason_for_change: "Wrong entry",
	user_id: "",
	timestamp: new Date().toISOString(),
};

const mockFetch = vi.fn();

describe("AuditLogs", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockFetch.mockResolvedValue(
			jsonResponse({
				data: [createLog, updateLog, deleteLog],
				nextCursor: null,
			}),
		);
		global.fetch = mockFetch as unknown as typeof fetch;
	});

	it("renders a loader while fetching", async () => {
		mockFetch.mockImplementation(() => new Promise(() => {}));
		render(<AuditLogs />);
		expect(document.querySelector(".animate-spin")).toBeInTheDocument();
		expect(screen.queryByText("System Audit History")).not.toBeInTheDocument();
	});

	it("renders audit logs with computed action badges", async () => {
		render(<AuditLogs />);
		expect(await screen.findByText("Activity Log")).toBeInTheDocument();
		expect(screen.getByText("CREATE")).toBeInTheDocument();
		expect(screen.getByText("UPDATE")).toBeInTheDocument();
		expect(screen.getByText("DELETE")).toBeInTheDocument();
	});

	it("truncates operator uids and falls back to System", async () => {
		render(<AuditLogs />);
		await screen.findByText("Activity Log");
		expect(screen.getByText("01234567...")).toBeInTheDocument();
		expect(screen.getByText("ABCDEFGH...")).toBeInTheDocument();
		expect(screen.getByText("System")).toBeInTheDocument();
	});

	it("renders table names, reasons and payload data", async () => {
		render(<AuditLogs />);
		await screen.findByText("Activity Log");
		expect(screen.getByText("game sales")).toBeInTheDocument();
		expect(screen.getByText("Promotion")).toBeInTheDocument();
		expect(screen.getByText("Initial entry")).toBeInTheDocument();
		expect(screen.getByText('{"quantity_sold":2}')).toBeInTheDocument();
	});

	it("renders the empty state when there are no logs", async () => {
		mockFetch.mockResolvedValue(jsonResponse({ data: [], nextCursor: null }));
		render(<AuditLogs />);
		expect(
			await screen.findByText("No activity logs recorded."),
		).toBeInTheDocument();
	});

	it("shows an error toast and stops loading on failure", async () => {
		mockFetch.mockResolvedValue(jsonResponse({ error: "boom" }, false, 500));
		render(<AuditLogs />);
		await waitFor(() =>
			expect(toast.error).toHaveBeenCalledWith("Failed to load audit logs"),
		);
		expect(
			await screen.findByText("No activity logs recorded."),
		).toBeInTheDocument();
	});

	it("loads the next page when Load More is clicked", async () => {
		mockFetch.mockImplementation((url: string) => {
			if (String(url).includes("cursor=")) {
				return jsonResponse({ data: [deleteLog], nextCursor: null });
			}
			return jsonResponse({
				data: [createLog, updateLog],
				nextCursor: "cursor-1",
			});
		});
		render(<AuditLogs />);
		await screen.findByText("Initial entry");

		fireEvent.click(screen.getByRole("button", { name: "Load More" }));

		await waitFor(() =>
			expect(mockFetch).toHaveBeenCalledWith(
				expect.stringContaining("cursor=cursor-1"),
				expect.anything(),
			),
		);
	});
});
