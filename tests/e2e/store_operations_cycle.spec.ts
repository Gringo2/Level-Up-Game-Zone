import { expect, test } from "@playwright/test";

test.describe("Full Store Operational Cycle (End-to-End)", () => {
	test("Executes full business day: shift start, sales logging, credit advance, shift close with discrepancy safeguard, reports reconciliation, and audit log verification", async ({
		page,
	}) => {
		// 1. Setup authenticated Admin session
		await page.addInitScript(() => {
			// @ts-expect-error E2E test mock injection
			window.__E2E_USER__ = {
				uid: "admin1",
				email: "admin@example.com",
				displayName: "Admin Operator",
				role: "admin",
			};
		});

		// 2. Stateful In-Memory Mock Store
		let activeShift: Record<string, unknown> | null = null;
		let shifts: Array<Record<string, unknown>> = [];
		const sales: Array<Record<string, unknown>> = [];
		const credits: Array<Record<string, unknown>> = [];
		const auditLogs: Array<Record<string, unknown>> = [];

		const rates = [
			{
				id: "rate-ps5",
				game_name: "PS5 Gaming",
				price_per_unit: 15,
				unit_type: "Hour",
				isActive: true,
			},
		];

		const employees = [
			{
				id: "emp-1",
				name: "Alice Worker",
				position: "Cashier",
				baseSalary: 400,
				hiredDate: "2026-01-01",
				isActive: true,
			},
		];

		await page.route("**/api/**", async (route) => {
			const url = new URL(route.request().url());
			const path = url.pathname;
			const method = route.request().method();

			// Shifts API
			if (path === "/api/shifts" && method === "GET") {
				return route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify(shifts),
				});
			}

			if (path === "/api/shifts/missed" && method === "GET") {
				return route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify({ missedShifts: [], gapDates: [] }),
				});
			}

			if (path === "/api/shifts/auto-open" && method === "POST") {
				return route.fulfill({
					status: 409,
					contentType: "application/json",
					body: JSON.stringify({
						error: "Shift already closed or requires manual start",
					}),
				});
			}

			if (path === "/api/shifts" && method === "POST") {
				const body = route.request().postDataJSON();
				activeShift = {
					id: "shift-e2e-101",
					manager_id: "admin1",
					manager_name: "Admin Operator",
					opening_float: body?.floatAmount ?? 100,
					start_time: new Date().toISOString(),
					status: "OPEN",
				};
				shifts = [activeShift];
				return route.fulfill({
					status: 201,
					contentType: "application/json",
					body: JSON.stringify(activeShift),
				});
			}

			if (path.match(/\/api\/shifts\/[^/]+\/close/) && method === "POST") {
				const body = route.request().postDataJSON();
				const closingCash = Number(body?.actualCashCounted ?? 110);
				const reason = body?.shortageReason ?? "";
				const closedShift = {
					...(activeShift ?? {}),
					id: "shift-e2e-101",
					manager_id: "admin1",
					manager_name: "Admin Operator",
					opening_float: 100,
					status: "CLOSED",
					end_time: new Date().toISOString(),
					expected_cash_calculated: 115,
					actual_cash_counted: closingCash,
					variance: closingCash - 115,
					reason_for_shortage: reason,
				};
				activeShift = null;
				shifts = [closedShift];
				auditLogs.unshift({
					id: "audit-shift-close-1",
					timestamp: new Date().toISOString(),
					user_id: "admin1",
					action: "UPDATE",
					table_affected: "shifts",
					reason_for_change: `Shift closed with variance -$5.00: ${reason}`,
					new_value: closedShift,
				});
				return route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify(closedShift),
				});
			}

			// Rates API
			if (path === "/api/rates" && method === "GET") {
				return route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify(rates),
				});
			}

			// Sales API
			if (path === "/api/sales" && method === "GET") {
				return route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify(sales),
				});
			}

			if (path === "/api/sales" && method === "POST") {
				const body = route.request().postDataJSON();
				const newSale = {
					id: `sale-${Date.now()}`,
					game_id: body.game_id,
					game_name: body.game_name,
					quantity_sold: Number(body.quantity_sold),
					rate_applied: Number(body.rate_applied),
					calculated_total: Number(body.calculated_total),
					unit_type: "Hour",
					date: body.date || new Date().toISOString(),
					user_id: "admin1",
				};
				sales.unshift(newSale);
				return route.fulfill({
					status: 201,
					contentType: "application/json",
					body: JSON.stringify(newSale),
				});
			}

			// Employees API
			if (path === "/api/employees" && method === "GET") {
				return route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify(employees),
				});
			}

			// Credits API
			if (path === "/api/credits" && method === "GET") {
				return route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify(credits),
				});
			}

			if (path === "/api/credits" && method === "POST") {
				const body = route.request().postDataJSON();
				const newCredit = {
					id: `credit-${Date.now()}`,
					employee_id: body.employee_id,
					employee_name: body.employee_name,
					amount: Number(body.amount),
					reason: body.reason,
					date: body.date || new Date().toISOString(),
					status: "Pending",
					user_id: "admin1",
				};
				credits.unshift(newCredit);
				return route.fulfill({
					status: 201,
					contentType: "application/json",
					body: JSON.stringify(newCredit),
				});
			}

			// Keno & Expenses APIs (empty)
			if (path === "/api/keno" && method === "GET") {
				return route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify([]),
				});
			}

			if (path === "/api/expenses" && method === "GET") {
				return route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify([]),
				});
			}

			// Audit Logs API
			if (path === "/api/audit-logs" && method === "GET") {
				return route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify({
						data: auditLogs,
						nextCursor: null,
					}),
				});
			}

			return route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify([]),
			});
		});

		// 3. Step 1: Start Shift with Opening Float ($100.00)
		await page.goto("/");
		await expect(
			page.getByRole("heading", { name: "No Active Shift" }),
		).toBeVisible();

		await page.getByRole("button", { name: "Start Shift" }).click();
		const startFloatInput = page.locator("#startFloat");
		await expect(startFloatInput).toBeVisible();
		await startFloatInput.fill("100.00");
		await page.getByRole("button", { name: "Confirm & Start Shift" }).click();

		// Verify Active Shift card renders
		await expect(
			page.locator("text=Active Shift: Admin Operator"),
		).toBeVisible();

		// 4. Step 2: Navigate to Game Sales and Record Sale ($30.00)
		await page.getByRole("link", { name: "Game Sales" }).click();
		await expect(
			page.getByRole("heading", { name: "Game Sales" }),
		).toBeVisible();

		await page.locator("#game").selectOption("rate-ps5");
		await page.locator("#quantity").fill("2");
		await page.getByRole("button", { name: "Log Sale" }).click();

		await expect(
			page.locator("text=Game sale logged successfully!"),
		).toBeVisible();
		await expect(
			page
				.getByTestId("gamesale-history-row")
				.filter({ hasText: "PS5 Gaming" }),
		).toBeVisible();

		// 5. Step 3: Navigate to Credits (IOUs) and Log Advance ($15.00)
		await page.getByRole("link", { name: "Credits (IOUs)" }).click();
		await expect(
			page.getByRole("heading", { name: "Log Credits (IOUs)" }),
		).toBeVisible();

		await page.locator("#employee").selectOption("emp-1");
		await page.locator("#amount").fill("15.00");
		await page.locator("#creditReason").fill("Mid-shift lunch advance");
		await page.getByRole("button", { name: "Log Credit" }).click();

		await expect(
			page.locator("text=Credit logged successfully!"),
		).toBeVisible();
		await expect(
			page.locator("div.font-medium", { hasText: "Alice Worker" }),
		).toBeVisible();

		// 6. Step 4: Return to Dashboard and Close Register Shift with Discrepancy
		await page.getByRole("link", { name: "Dashboard" }).click();
		await expect(
			page.locator("text=Active Shift: Admin Operator"),
		).toBeVisible();

		await page.getByRole("button", { name: "Close Shift" }).click();
		const closingCashInput = page.locator("#closingCash");
		await expect(closingCashInput).toBeVisible();

		// Enter counted cash $110.00 (expected $115.00 -> -$5.00 variance)
		await closingCashInput.fill("110.00");
		await expect(page.getByText("Variance", { exact: true })).toBeVisible();
		await expect(
			page.locator("div.text-2xl.font-bold", { hasText: "$-5.00" }),
		).toBeVisible();

		// Shortage reason is required for |variance| > $2.00
		const reasonInput = page.locator("#reason");
		await expect(reasonInput).toBeVisible();
		await reasonInput.fill("Drawer shortage from coin discrepancy");

		// Submit close form
		await page.getByRole("button", { name: "Confirm & Close Shift" }).click();

		// ConfirmDialog safeguard triggers
		await expect(
			page.getByRole("heading", { name: "Confirm Shift Closure" }),
		).toBeVisible();
		await page.getByRole("button", { name: "Yes, Close Shift" }).click();

		// Verify Shift closed and Dashboard returns to No Active Shift state
		await expect(
			page.getByRole("heading", { name: "No Active Shift" }),
		).toBeVisible();

		// 7. Step 5: Navigate to Reports & Audit Shift Cash Reconciliation
		await page.getByRole("link", { name: "Reports" }).click();
		await expect(
			page.getByRole("heading", { name: "Historical Reports" }),
		).toBeVisible();

		// Verify Drawer Integrity KPIs
		await expect(page.locator("text=Net Drawer Variance")).toBeVisible();
		await expect(page.locator("text=0 / 1 Balanced")).toBeVisible();

		// Verify Shift Cash Reconciliation & Drawer Audit Table
		await expect(
			page.getByRole("heading", {
				name: "Shift Cash Reconciliation & Drawer Audit",
			}),
		).toBeVisible();
		await expect(page.locator("text=Admin Operator").first()).toBeVisible();
		await expect(page.locator("text=CLOSED").first()).toBeVisible();
		await expect(page.locator("text=$100.00").first()).toBeVisible();
		await expect(page.locator("text=$115.00").first()).toBeVisible();
		await expect(page.locator("text=$110.00").first()).toBeVisible();
		await expect(page.locator("text=-$5.00").first()).toBeVisible();
		await expect(
			page.getByText("Drawer shortage from coin discrepancy", { exact: true }),
		).toBeVisible();

		// 8. Step 6: Navigate to Activity Log & Audit Immutable Trail
		await page.getByRole("link", { name: "Activity Log" }).click();
		await expect(
			page.getByRole("heading", { name: "Activity Log" }),
		).toBeVisible();

		await expect(page.locator("text=UPDATE").first()).toBeVisible();
		await expect(page.locator("text=shifts").first()).toBeVisible();
		await expect(
			page.getByRole("cell", {
				name: /Shift closed with variance/,
			}),
		).toBeVisible();
	});
});
