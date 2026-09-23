import { expect, type Page, test } from "@playwright/test";

interface MockBettingLog {
	id: string;
	net_profit: number;
	user_id: string;
	user_name: string;
	date: string;
	verified?: boolean;
}

async function setupBettingMocks(
	page: Page,
	initialLogs: MockBettingLog[] = [],
	role = "manager",
) {
	let logs = [...initialLogs];

	await page.addInitScript((userRole) => {
		// @ts-expect-error E2E test mock injection
		window.__E2E_USER__ = {
			uid: "mgr123",
			email: "manager@example.com",
			displayName: "Manager User",
			role: userRole,
		};
	}, role);

	await page.route("**/api/**", async (route) => {
		const url = new URL(route.request().url());
		const path = url.pathname;
		const method = route.request().method();

		// Shifts API mock for Dashboard/Layout
		if (path === "/api/shifts") {
			return route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify([]),
			});
		}

		// Sports Betting Endpoints
		if (path === "/api/sports-betting") {
			if (method === "GET") {
				return route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify({
						data: logs,
						nextCursor: null,
					}),
				});
			}

			if (method === "POST") {
				const body = route.request().postDataJSON() as {
					net_profit: number;
					date?: string;
				};
				const newLog: MockBettingLog = {
					id: `betting-${Date.now()}`,
					net_profit: body.net_profit,
					user_id: "mgr123",
					user_name: "Manager User",
					date: body.date || new Date().toISOString(),
					verified: true, // Manager entries auto-verify
				};
				logs.unshift(newLog);
				return route.fulfill({
					status: 201,
					contentType: "application/json",
					body: JSON.stringify(newLog),
				});
			}
		}

		const verifyMatch = path.match(/^\/api\/sports-betting\/([^/]+)\/verify$/);
		if (verifyMatch && method === "PUT") {
			const id = verifyMatch[1];
			logs = logs.map((l) => (l.id === id ? { ...l, verified: true } : l));
			return route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({ success: true }),
			});
		}

		const singleMatch = path.match(/^\/api\/sports-betting\/([^/]+)$/);
		if (singleMatch) {
			const id = singleMatch[1];
			if (method === "PUT") {
				const body = route.request().postDataJSON() as {
					net_profit: number;
					editReason: string;
				};
				let updated: MockBettingLog | undefined;
				logs = logs.map((l) => {
					if (l.id === id) {
						updated = { ...l, net_profit: body.net_profit };
						return updated;
					}
					return l;
				});
				return route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify(updated || { id, net_profit: body.net_profit }),
				});
			}

			if (method === "DELETE") {
				logs = logs.filter((l) => l.id !== id);
				return route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify({ success: true }),
				});
			}
		}

		return route.fulfill({
			status: 200,
			contentType: "application/json",
			body: JSON.stringify([]),
		});
	});

	return {
		getLogs: () => logs,
	};
}

test.describe("Sports Betting E2E Lifecycle & RBAC", () => {
	test("Staff role is blocked from /betting and link is hidden from navigation", async ({
		page,
	}) => {
		await setupBettingMocks(page, [], "staff");

		// Attempt direct navigation
		await page.goto("/betting");
		await expect(page).toHaveURL("http://localhost:3002/");

		// Navigation link should not exist
		await expect(page.locator("a[href='/betting']")).not.toBeVisible();
	});

	test("Manager navigates to /betting and logs positive net income & negative loss", async ({
		page,
	}) => {
		await setupBettingMocks(page, [], "manager");

		await page.goto("/");
		await expect(page.locator("a[href='/betting']")).toBeVisible();
		await page.locator("a[href='/betting']").click();

		await expect(page).toHaveURL("http://localhost:3002/betting");
		await expect(
			page.getByRole("heading", { name: "Log Sports Betting" }),
		).toBeVisible();

		// Empty state is rendered
		await expect(
			page.getByText("No sports betting logged today yet."),
		).toBeVisible();

		// 1. Submit positive net profit entry
		await page.locator("#net").fill("150.00");
		await expect(page.locator("text=Net Profit").locator("..")).toContainText(
			"$150.00",
		);
		await page.getByRole("button", { name: "Log Betting" }).click();

		// Wait for row and toast
		const firstRow = page
			.locator("[data-testid='betting-history-row']")
			.first();
		await expect(firstRow).toBeVisible();
		await expect(firstRow).toContainText("Net: $150.00");
		await expect(firstRow).toContainText("Verified");

		// Summary banner displays 1 entry and $150.00
		const summary = page.locator("[data-testid='betting-range-summary']");
		await expect(summary).toContainText("1 entry");
		await expect(summary).toContainText("Net $150.00");

		// 2. Submit negative net loss entry
		await page.locator("#net").fill("-45.50");
		await expect(page.locator("text=Net Profit").locator("..")).toContainText(
			"$-45.50",
		);
		await page.getByRole("button", { name: "Log Betting" }).click();

		// 2 rows present now
		await expect(
			page.locator("[data-testid='betting-history-row']"),
		).toHaveCount(2);
		await expect(page.locator("text=Net: $-45.50")).toBeVisible();
		await expect(summary).toContainText("2 entries");
		await expect(summary).toContainText("Net $104.50");
	});

	test("Manager verifies an unverified entry", async ({ page }) => {
		const initialLogs: MockBettingLog[] = [
			{
				id: "unverified-entry-1",
				net_profit: 85.0,
				user_id: "staff1",
				user_name: "Staff Member",
				date: new Date().toISOString(),
				verified: false,
			},
		];
		await setupBettingMocks(page, initialLogs, "manager");

		await page.goto("/betting");
		const row = page.locator("[data-testid='betting-history-row']").first();
		await expect(row).toBeVisible();
		await expect(row).toContainText("Unverified");

		const verifyBtn = row.getByRole("button", { name: "Verify" });
		await expect(verifyBtn).toBeVisible();

		await verifyBtn.click();
		await expect(row).toContainText("Verified");
		await expect(row.getByRole("button", { name: "Verify" })).not.toBeVisible();
	});

	test("Manager edits an entry with mandatory audit reason", async ({
		page,
	}) => {
		const initialLogs: MockBettingLog[] = [
			{
				id: "entry-to-edit",
				net_profit: 100.0,
				user_id: "mgr123",
				user_name: "Manager User",
				date: new Date().toISOString(),
				verified: true,
			},
		];
		await setupBettingMocks(page, initialLogs, "manager");

		await page.goto("/betting");
		const row = page.locator("[data-testid='betting-history-row']").first();
		await expect(row).toContainText("Net: $100.00");

		// Click Edit
		await row.getByRole("button", { name: "Edit" }).click();

		// Form transitions to Edit mode
		await expect(page.getByText("Edit Entry")).toBeVisible();
		const submitBtn = page.getByRole("button", { name: "Update Entry" });
		await expect(submitBtn).toBeDisabled(); // Disabled because reason is empty

		// Fill reason and update amount
		await page.locator("#net").fill("120.00");
		await page
			.locator("#editReason")
			.fill("Terminal slip recount added late ticket");
		await expect(submitBtn).toBeEnabled();

		await submitBtn.click();

		// Form returns to New Entry and list shows updated amount
		await expect(page.getByText("New Entry")).toBeVisible();
		await expect(row).toContainText("Net: $120.00");
	});

	test("Manager deletes an entry with confirmation dialog and required reason", async ({
		page,
	}) => {
		const initialLogs: MockBettingLog[] = [
			{
				id: "entry-to-delete",
				net_profit: 50.0,
				user_id: "mgr123",
				user_name: "Manager User",
				date: new Date().toISOString(),
				verified: true,
			},
		];
		await setupBettingMocks(page, initialLogs, "manager");

		await page.goto("/betting");
		const row = page.locator("[data-testid='betting-history-row']").first();
		await expect(row).toBeVisible();

		// Click Delete
		await row
			.getByRole("button", { name: "Delete sports betting log" })
			.click();

		// Confirm dialog appears
		const dialog = page.locator(".fixed.z-50");
		await expect(
			dialog.getByRole("heading", { name: "Delete Sports Betting Log" }),
		).toBeVisible();

		const confirmDeleteBtn = dialog.getByRole("button", { name: "Delete" });
		await expect(confirmDeleteBtn).toBeDisabled(); // Disabled without reason

		await dialog
			.locator("input")
			.fill("Duplicate transmission from sports terminal");
		await expect(confirmDeleteBtn).toBeEnabled();

		await confirmDeleteBtn.click();

		// Row should be removed and empty state shown
		await expect(
			page.locator("[data-testid='betting-history-row']"),
		).toHaveCount(0);
		await expect(
			page.getByText("No sports betting logged today yet."),
		).toBeVisible();
	});

	test("Sports Betting page maintains responsive containment with zero overflow across mobile and tablet viewports", async ({
		page,
	}) => {
		const initialLogs: MockBettingLog[] = [
			{
				id: "sample-entry-1",
				net_profit: 145.5,
				user_id: "mgr123",
				user_name: "Manager User",
				date: new Date().toISOString(),
				verified: true,
			},
		];
		await setupBettingMocks(page, initialLogs, "manager");

		for (const viewport of [
			{ width: 320, height: 568 },
			{ width: 375, height: 812 },
			{ width: 768, height: 1024 },
			{ width: 1280, height: 800 },
		]) {
			await page.setViewportSize(viewport);
			await page.goto("/betting");

			await expect(
				page.getByRole("heading", { name: "Log Sports Betting" }),
			).toBeVisible();

			// 1. Verify net input has inputMode decimal for mobile keypads
			const netInput = page.locator("#net");
			await expect(netInput).toHaveAttribute("inputmode", "decimal");

			// 2. Verify date toolbar elements are visible
			await expect(page.locator("#bettingRangeStart")).toBeVisible();
			await expect(page.locator("#bettingRangeEnd")).toBeVisible();
			await expect(page.getByRole("button", { name: "Apply" })).toBeVisible();
			await expect(page.getByRole("button", { name: "Today" })).toBeVisible();

			// 3. Verify zero horizontal overflow on the page container
			const noOverflow = await page.evaluate(() => {
				const main = document.querySelector("main");
				return main ? main.scrollWidth <= main.clientWidth + 1 : true;
			});
			expect(
				noOverflow,
				`Sports Betting container overflowed at ${viewport.width}px viewport`,
			).toBe(true);
		}
	});
});
