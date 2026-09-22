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
		// @ts-expect-error E2E test mock injection
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

test("mobile navigation collapses and opens via hamburger toggle on mobile", async ({
	page,
}) => {
	await page.setViewportSize({ width: 375, height: 800 });
	await prepareAuthenticatedPage(page);

	await page.goto("/games");
	const toggleBtn = page.getByRole("button", {
		name: "Toggle navigation menu",
	});
	await expect(toggleBtn).toBeVisible();

	// Mobile drawer is initially closed
	await expect(page.getByTestId("mobile-nav-drawer")).toHaveCount(0);
	await page.screenshot({
		path: "/home/gringo2/.gemini/antigravity-ide/brain/b18e8a86-1f46-481f-a96f-9a5958eff1a3/screenshots/mobile_header_collapsed_m108.png",
	});

	// Click to open drawer
	await toggleBtn.click();
	const drawer = page.getByTestId("mobile-nav-drawer");
	await expect(drawer).toBeVisible();
	await page.screenshot({
		path: "/home/gringo2/.gemini/antigravity-ide/brain/b18e8a86-1f46-481f-a96f-9a5958eff1a3/screenshots/mobile_drawer_open_m108.png",
	});

	// Click nav link to navigate and auto-close drawer
	await drawer.getByRole("link", { name: "Keno" }).click();
	await expect(page).toHaveURL(/.*\/keno/);
	await expect(page.getByTestId("mobile-nav-drawer")).toHaveCount(0);
});
