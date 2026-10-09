import { expect, type Page, test } from "@playwright/test";
import { api, bootstrap, openAs } from "./support";

// M-134 / ACP-042: a business day through the real client, server and database.
// Guards TD-063 (the shift counts its own entries) and TD-064 (credit without a reason).
const pick = async (page: Page, select: string, contains: string) => {
	const label = (await page.locator(`${select} option`).allTextContents()).find(
		(t) => t.includes(contains),
	);
	if (!label)
		throw new Error(`no option containing "${contains}" in ${select}`);
	await page.locator(select).selectOption({ label });
};
const goTo = async (page: Page, link: string) => {
	await page.getByRole("link", { name: link }).click();
	await page.waitForTimeout(500);
};
const submit = async (page: Page, toast: string) => {
	await page.locator("form button[type=submit]").first().click();
	await expect(page.getByText(toast).first()).toBeVisible();
};

test("a full business day: entries count in the shift, the cash adds up, and it closes", async ({
	page,
}) => {
	const { admin, manager } = await bootstrap();
	await openAs(page, manager);

	await page.goto("/");
	await expect(page.getByText("Shift Management")).toBeVisible();
	await page.reload(); // dev StrictMode runs the first auto-open twice; a reload shows the shift
	await expect(page.getByText(/Active Shift:/)).toBeVisible();

	await page.getByRole("button", { name: "Update Float" }).click();
	await page.locator("#updateFloat").fill("100");
	await page.getByRole("button", { name: "Save" }).click();
	await expect(page.getByText("Float updated successfully!")).toBeVisible();

	await goTo(page, "Game Sales");
	await pick(page, "#game", "PS4");
	await page.locator("#quantity").fill("3");
	await submit(page, "Game sale logged successfully!");
	await pick(page, "#game", "Pool");
	await page.locator("#quantity").fill("4");
	await submit(page, "Game sale logged successfully!");

	await goTo(page, "Keno");
	await page.locator("#net").fill("40");
	await submit(page, "Keno logged successfully!");

	await goTo(page, "Sports Betting");
	await page.locator("#net").fill("-10");
	await submit(page, "Sports betting logged successfully!");

	await goTo(page, "Expenses");
	await page.locator("#itemName").fill("Tea");
	await page.locator("#description").fill("Staff tea");
	await page.locator("#amount").fill("12.5");
	await submit(page, "Expense logged successfully!");

	await goTo(page, "Credits (IOUs)");
	await pick(page, "#employee", "Alice Worker");
	await page.locator("#amount").fill("20");
	// Reason deliberately left blank: this used to fail with "Failed to save credit".
	await submit(page, "Credit logged successfully!");

	await goTo(page, "Dashboard");
	const main = page.locator("main");
	await expect(main).toContainText("$23.00"); // game sales: 3 x 5 + 4 x 2
	await expect(main).toContainText("$40.00"); // keno net
	await expect(main).toContainText("$-10.00"); // sports betting net

	await page.getByRole("button", { name: "Close Shift (Blind Count)" }).click();
	await page.locator("#closingCash").fill("120.5"); // 100 + 40 + 23 - 10 - 12.50 - 20
	await expect(main).toContainText("Expected Cash: $120.50");
	await expect(page.getByText("Variance", { exact: true })).toBeVisible();
	await expect(
		page.locator("div.text-2xl.font-bold", { hasText: "$0.00" }).first(),
	).toBeVisible();
	await page.getByRole("button", { name: "Confirm & Close Shift" }).click();
	await page.getByRole("button", { name: "Yes, Close Shift" }).click();
	await expect(
		page.getByRole("heading", { name: "No Active Shift" }),
	).toBeVisible();

	const shifts = await api("GET", "/api/shifts", admin.token);
	const closed = (
		shifts.body as Array<{
			status: string;
			expected_cash_calculated: number;
			variance: number;
		}>
	).find((s) => s.status === "CLOSED");
	expect(closed).toMatchObject({
		expected_cash_calculated: 120.5,
		variance: 0,
	});
});
