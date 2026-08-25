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
		await expect(page).toHaveURL("http://localhost:3002/");
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

	test("Manager cannot access the admin-only Users page", async ({ page }) => {
		await page.addInitScript(() => {
			// @ts-expect-error
			window.__E2E_USER__ = {
				uid: "mgr1",
				email: "mgr@example.com",
				displayName: "Manager",
				role: "manager",
			};
		});

		await page.route("**/api/**", async (route) => {
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify([]),
			});
		});

		await page.goto("/admin/users");
		await expect(page).toHaveURL("http://localhost:3002/");
	});

	test("Manager cannot access the admin-only Audit Logs page", async ({
		page,
	}) => {
		await page.addInitScript(() => {
			// @ts-expect-error
			window.__E2E_USER__ = {
				uid: "mgr1",
				email: "mgr@example.com",
				displayName: "Manager",
				role: "manager",
			};
		});

		await page.route("**/api/**", async (route) => {
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify([]),
			});
		});

		await page.goto("/audit-logs");
		await expect(page).toHaveURL("http://localhost:3002/");
	});

	test("Admin can access the Users management page", async ({ page }) => {
		await page.addInitScript(() => {
			// @ts-expect-error
			window.__E2E_USER__ = {
				uid: "admin123",
				email: "bezueyob3@gmail.com",
				displayName: "Admin User",
				role: "admin",
			};
		});

		await page.route("**/api/**", async (route) => {
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify([]),
			});
		});

		await page.goto("/admin/users");
		await expect(page.locator("text=Invite User").first()).toBeVisible();
	});
});
