import { expect, test } from "@playwright/test";

test.describe("Role-Based Access Control (RBAC) Isolation", () => {
	test("Staff role cannot access Admin page and is redirected home", async ({
		page,
	}) => {
		await page.addInitScript(() => {
			// @ts-expect-error
			window.__E2E_USER__ = {
				uid: "staff123",
				email: "staff@example.com",
				displayName: "Staff Member",
				role: "staff",
			};
		});

		await page.route("**/api/shifts", async (route) => {
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify([]),
			});
		});

		await page.goto("/admin");
		await expect(page).toHaveURL("http://localhost:3000/");
	});

	test("Admin role can access Admin Management page", async ({ page }) => {
		await page.addInitScript(() => {
			// @ts-expect-error
			window.__E2E_USER__ = {
				uid: "admin123",
				email: "bezueyob3@gmail.com",
				displayName: "Admin User",
				role: "admin",
			};
		});

		await page.route("**/api/rates", async (route) => {
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify([]),
			});
		});

		await page.route("**/api/shifts", async (route) => {
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify([]),
			});
		});

		await page.goto("/admin");
		await expect(page.locator("text=Admin Settings")).toBeVisible();
	});
});
