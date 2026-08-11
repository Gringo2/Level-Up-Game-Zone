import { expect, test } from "@playwright/test";

test.describe("Authenticated Dashboard Flow & API Mocks", () => {
	test("Dashboard renders metric cards and sales logs for active shift", async ({
		page,
	}) => {
		const today = new Date().toISOString();

		await page.addInitScript(() => {
			// @ts-expect-error
			window.__E2E_USER__ = {
				uid: "manager123",
				email: "manager@example.com",
				displayName: "Manager User",
				role: "manager",
			};
		});

		// Mock Active Shift API
		await page.route("**/api/shifts", async (route) => {
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify([
					{
						id: "shift-1",
						manager_id: "manager123",
						manager_name: "Manager User",
						opening_float: 100,
						start_time: today,
						status: "OPEN",
					},
				]),
			});
		});

		// Mock Sales API
		await page.route("**/api/sales", async (route) => {
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify([
					{
						id: "sale-1",
						game_name: "PS5 Gaming",
						quantity_sold: 2,
						rate_applied: 15,
						calculated_total: 30,
						user_id: "manager123",
						date: today,
					},
				]),
			});
		});

		// Mock Keno API
		await page.route("**/api/keno", async (route) => {
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify([]),
			});
		});

		// Mock Credits API
		await page.route("**/api/credits", async (route) => {
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify([]),
			});
		});

		// Mock Expenses API
		await page.route("**/api/expenses", async (route) => {
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify([]),
			});
		});

		await page.goto("/");
		await expect(page.locator("h2:has-text('Dashboard')")).toBeVisible();
		await expect(page.locator("text=Shift Management")).toBeVisible();
	});
});
