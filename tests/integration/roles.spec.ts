import { expect, test } from "@playwright/test";
import { bootstrap, openAs } from "./support";

// M-134 / ACP-042: what each role sees, against the real server (TD-059).
test("a manager sees categories but not the admin-only rate and employee cards", async ({
	page,
}) => {
	const { manager } = await bootstrap();
	await openAs(page, manager);
	await page.goto("/admin");
	await expect(page.getByText("Manage Categories")).toBeVisible();
	await expect(page.getByText("Current Rates")).toBeVisible();
	await expect(page.getByText("Add Game Rate")).toHaveCount(0);
	await expect(page.getByText("Add Store Employee")).toHaveCount(0);
});

test("an admin sees every control and can add a rate that the server accepts", async ({
	page,
}) => {
	const { admin } = await bootstrap();
	await openAs(page, admin);
	await page.goto("/admin");
	await expect(page.getByText("Add Game Rate")).toBeVisible();
	await expect(page.getByText("Add Store Employee")).toBeVisible();
	await page.locator("#gameName").fill("Darts");
	await page.locator("#price").fill("3");
	await page.locator("form button[type=submit]").first().click();
	await expect(page.getByText("Darts").first()).toBeVisible();
});

test("with no games configured, staff are told to ask an admin and an admin gets the button", async ({
	page,
	browser,
}) => {
	const { staff, admin } = await bootstrap({ withRates: false });
	await openAs(page, staff);
	await page.goto("/games");
	await expect(page.getByText("No games configured!")).toBeVisible();
	await expect(page.getByText(/ask an admin/i)).toBeVisible();
	await expect(
		page.getByRole("button", { name: /Add Default Games/ }),
	).toHaveCount(0);

	const second = await browser.newPage();
	await openAs(second, admin);
	await second.goto("/games");
	await expect(
		second.getByRole("button", { name: /Add Default Games/ }),
	).toBeVisible();
	await second.getByRole("button", { name: /Add Default Games/ }).click();
	await expect(second.getByText("Default games configured!")).toBeVisible(); // the real server accepts the admin's request
	await second.close();
});
