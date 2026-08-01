import { expect, test } from "@playwright/test";

test.describe("Shift Management Cycle", () => {
	test("Login screen prevents shift management without authentication", async ({
		page,
	}) => {
		// Without mocking a full Google OAuth flow, we verify that the shift modal
		// and shift actions are completely hidden from the DOM when unauthenticated.
		await page.goto("/");
		await expect(page.locator("text=Start Shift")).not.toBeVisible();
		await expect(page.locator("text=Close Shift")).not.toBeVisible();
	});
});
