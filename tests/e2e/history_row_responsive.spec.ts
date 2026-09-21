import { expect, type Page, test } from "@playwright/test";

const salesLog = {
	id: "sale-1",
	game_name: "PS5 Gaming",
	quantity_sold: 2,
	rate_applied: 5,
	calculated_total: 10,
	unit_type: "Hour",
	user_id: "manager123",
	user_name: "Manager User",
	date: "2026-09-21T12:00:00.000Z",
	verified: false,
};

const kenoLog = {
	id: "keno-1",
	net_profit: 60,
	sales: 100,
	payouts: 40,
	user_id: "manager123",
	user_name: "Manager User",
	date: "2026-09-21T12:00:00.000Z",
	verified: false,
};

async function prepareAuthenticatedPage(page: Page) {
	await page.addInitScript(() => {
		window.__E2E_USER__ = {
			uid: "manager123",
			email: "manager@example.com",
			displayName: "Manager User",
			role: "manager",
		};
	});

	await page.route("**/api/**", async (route) => {
		const path = new URL(route.request().url()).pathname;
		const body = path.endsWith("/rates")
			? [
					{
						id: "rate-1",
						game_name: "PS5 Gaming",
						price_per_unit: 5,
						unit_type: "Hour",
						isActive: true,
					},
				]
			: path.includes("/sales")
				? [salesLog]
				: path.includes("/keno")
					? [kenoLog]
					: [];
		await route.fulfill({
			status: 200,
			contentType: "application/json",
			body: JSON.stringify(body),
		});
	});
}

for (const viewport of [
	{ name: "mobile", width: 375, height: 800 },
	{ name: "desktop", width: 1280, height: 900 },
]) {
	test(`history rows remain usable at ${viewport.name} width`, async ({
		page,
	}) => {
		await page.setViewportSize(viewport);
		await prepareAuthenticatedPage(page);

		await page.goto("/games");
		const salesRow = page.getByTestId("gamesale-history-row");
		await expect(salesRow).toBeVisible();
		await expect(
			salesRow.getByRole("button", { name: "Verify" }),
		).toBeVisible();
		await expect(
			salesRow.getByRole("button", { name: "Delete game sale" }),
		).toBeVisible();
		await salesRow.getByRole("button", { name: "Verify" }).focus();
		await expect(
			salesRow.getByRole("button", { name: "Verify" }),
		).toBeFocused();
		await expect(
			page.evaluate(
				() => document.documentElement.scrollWidth <= window.innerWidth,
			),
		).resolves.toBe(true);

		await page.goto("/keno");
		const kenoRow = page.getByTestId("keno-history-row");
		await expect(kenoRow).toBeVisible();
		await expect(kenoRow.getByRole("button", { name: "Verify" })).toBeVisible();
		await expect(
			kenoRow.getByRole("button", { name: "Delete keno log" }),
		).toBeVisible();
		await kenoRow.getByRole("button", { name: "Verify" }).focus();
		await expect(kenoRow.getByRole("button", { name: "Verify" })).toBeFocused();
		await expect(
			page.evaluate(
				() => document.documentElement.scrollWidth <= window.innerWidth,
			),
		).resolves.toBe(true);
	});
}
