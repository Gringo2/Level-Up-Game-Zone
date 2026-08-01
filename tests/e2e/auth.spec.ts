import { expect, test } from "@playwright/test";

test.describe("Authentication & Routing", () => {
	test("Unauthenticated users are forced to the Login page", async ({
		page,
	}) => {
		await page.goto("/");
		await expect(page.locator("text=Game Zone Manager")).toBeVisible();
		await expect(page.locator("text=Sign in with Google")).toBeVisible();
	});

	test("Unauthenticated users cannot bypass login via direct URL access", async ({
		page,
	}) => {
		await page.goto("/admin");
		await expect(page.locator("text=Game Zone Manager")).toBeVisible();

		await page.goto("/expenses");
		await expect(page.locator("text=Game Zone Manager")).toBeVisible();
	});
});
