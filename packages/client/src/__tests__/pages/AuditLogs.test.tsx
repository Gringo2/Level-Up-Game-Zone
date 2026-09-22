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
		expect(screen.getByRole("cell", { name: "CREATE" })).toBeInTheDocument();
		expect(screen.getByRole("cell", { name: "UPDATE" })).toBeInTheDocument();
		expect(screen.getByRole("cell", { name: "DELETE" })).toBeInTheDocument();
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
		expect(
			screen.getByRole("cell", { name: "game sales" }),
		).toBeInTheDocument();
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

	it("filters logs by action (CREATE, UPDATE, DELETE)", async () => {
		render(<AuditLogs />);
		await screen.findByText("Initial entry");

		const actionSelect = screen.getByLabelText("Action Filter");
		fireEvent.change(actionSelect, { target: { value: "UPDATE" } });

		expect(screen.getByText("Promotion")).toBeInTheDocument();
		expect(screen.queryByText("Initial entry")).not.toBeInTheDocument();
		expect(screen.queryByText("Wrong entry")).not.toBeInTheDocument();
		expect(
			screen.getByText("Showing 1 of 3 activity logs"),
		).toBeInTheDocument();
	});

	it("filters logs by collection / table affected", async () => {
		render(<AuditLogs />);
		await screen.findByText("Initial entry");

		const tableSelect = screen.getByLabelText("Collection Filter");
		fireEvent.change(tableSelect, { target: { value: "keno_tickets" } });

		expect(screen.getByText("Wrong entry")).toBeInTheDocument();
		expect(screen.queryByText("Promotion")).not.toBeInTheDocument();
		expect(screen.queryByText("Initial entry")).not.toBeInTheDocument();
	});

	it("filters logs by search query matching operator, reason, or payload", async () => {
		render(<AuditLogs />);
		await screen.findByText("Initial entry");

		const searchInput = screen.getByPlaceholderText(
			"Search by operator UID, reason, or payload...",
		);
		fireEvent.change(searchInput, { target: { value: "01234567" } });

		expect(screen.getByText("Initial entry")).toBeInTheDocument();
		expect(screen.queryByText("Promotion")).not.toBeInTheDocument();
		expect(screen.queryByText("Wrong entry")).not.toBeInTheDocument();
	});

	it("clears all filters when Clear Filters button is clicked", async () => {
		render(<AuditLogs />);
		await screen.findByText("Initial entry");

		const actionSelect = screen.getByLabelText("Action Filter");
		fireEvent.change(actionSelect, { target: { value: "DELETE" } });

		expect(screen.queryByText("Initial entry")).not.toBeInTheDocument();

		const clearBtn = screen.getByRole("button", { name: /Clear/i });
		fireEvent.click(clearBtn);

		expect(screen.getByText("Initial entry")).toBeInTheDocument();
		expect(screen.getByText("Promotion")).toBeInTheDocument();
		expect(screen.getByText("Wrong entry")).toBeInTheDocument();
	});

	it("displays filter empty state when no logs match the active filter criteria", async () => {
		render(<AuditLogs />);
		await screen.findByText("Initial entry");

		const searchInput = screen.getByPlaceholderText(
			"Search by operator UID, reason, or payload...",
		);
		fireEvent.change(searchInput, {
			target: { value: "NON_EXISTENT_MATCH_PHRASE" },
		});

		expect(
			screen.getByText("No activity logs match the selected filters."),
		).toBeInTheDocument();
		expect(screen.queryByText("Initial entry")).not.toBeInTheDocument();
	});
});
