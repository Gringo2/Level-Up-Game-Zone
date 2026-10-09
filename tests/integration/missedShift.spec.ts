import { expect, test } from "@playwright/test";
import { PINNED_NOW } from "./clock";
import { api, bootstrap, openAs, seedDocument } from "./support";

// M-134 / ACP-042: a forgotten shift, from the Dashboard card to the stored result (TD-066).
const shopDay = (daysAgo: number) =>
	new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Addis_Ababa" }).format(
		new Date(new Date(PINNED_NOW).getTime() - daysAgo * 86_400_000),
	);

test("a forgotten shift can be closed from the Dashboard and only counts its own day", async ({
	page,
}) => {
	const { admin, manager } = await bootstrap();
	const day = shopDay(3);
	const opened = new Date(`${day}T09:00:00+03:00`).toISOString();
	await seedDocument("shifts", "old1", {
		manager_id: manager.uid,
		manager_name: "Mona",
		start_time: opened,
		opening_float: 100,
		status: "OPEN",
	});
	const sale = (id: string, total: number, date: string) =>
		seedDocument("game_sales_logs", id, {
			game_id: "ps4",
			game_name: "PS4",
			quantity_sold: total / 5,
			rate_applied: 5,
			calculated_total: total,
			user_id: manager.uid,
			date,
		});
	await sale("sameDay", 40, new Date(`${day}T11:00:00+03:00`).toISOString());
	await sale(
		"laterDay",
		500,
		new Date(`${shopDay(2)}T11:00:00+03:00`).toISOString(),
	);

	await openAs(page, manager);
	await page.goto("/");
	await expect(page.getByText(/Missed shifts need closing/)).toBeVisible();

	await page.getByLabel("Cash counted ($)").fill("140"); // 100 float + 40 that day; the 500 on a later day must not count
	await page.getByLabel("Reason (required)").fill("Forgot to close on the day");
	await page.getByRole("button", { name: "Close missed shift" }).click();
	await expect(page.getByText("Missed shift closed.")).toBeVisible();
	await expect(page.getByText(/Missed shifts need closing/)).toHaveCount(0);

	const shifts = await api("GET", "/api/shifts", admin.token);
	const closed = (
		shifts.body as Array<{
			id: string;
			status: string;
			expected_cash_calculated: number;
			variance: number;
			end_time: string;
		}>
	).find((s) => s.id === "old1");
	expect(closed).toMatchObject({
		status: "CLOSED",
		expected_cash_calculated: 140,
		variance: 0,
	});
	expect(closed?.end_time).toBe(
		new Date(`${day}T23:59:59.999+03:00`).toISOString(),
	);
});
