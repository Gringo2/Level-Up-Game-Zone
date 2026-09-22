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

async function prepareAuthenticatedPage(page: Page, role = "admin") {
	await page.addInitScript((userRole) => {
		// @ts-expect-error E2E test mock injection
		window.__E2E_USER__ = {
			uid: "admin123",
			email: "admin@example.com",
			displayName: "Admin User",
			role: userRole,
		};
	}, role);

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
			: path.endsWith("/users")
				? [
						{
							uid: "admin123",
							email: "admin@example.com",
							displayName: "Admin User",
							role: "admin",
							createdAt: "2026-01-01T00:00:00.000Z",
						},
						{
							uid: "cashier456",
							email: "cashier.alexander@levelup-gaming.example.com",
							displayName: "Jonathan Alexander Smith",
							role: "staff",
							createdAt: "2026-01-15T00:00:00.000Z",
						},
					]
				: path.endsWith("/employees")
					? [
							{
								id: "emp-1",
								name: "Jonathan Alexander Smith",
								position: "Senior Console Game Operator",
								base_salary: 800,
								hired_date: "2026-01-15",
								break_day: "Wednesday",
								user_uid: "cashier456",
								isActive: true,
								created_at: "2026-01-15T08:00:00.000Z",
							},
						]
					: path.endsWith("/credits")
						? {
								credits: [
									{
										id: "cred-1",
										employee_name: "Jonathan Alexander Smith",
										employee_id: "emp-1",
										amount: 45.0,
										reason: "Emergency transit allowance advance",
										status: "deducted",
										user_name: "Admin User",
										user_id: "admin123",
										date: "2026-09-22T02:00:00.000Z",
									},
								],
							}
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

	// Verify mobile drawer link legibility and high contrast classes
	const kenoLink = drawer.getByRole("link", { name: "Keno" });
	await expect(kenoLink).toBeVisible();
	await expect(kenoLink).toHaveClass(/text-zinc-200/);
	await expect(kenoLink).toHaveClass(/py-3/);

	await page.screenshot({
		path: "/home/gringo2/.gemini/antigravity-ide/brain/b18e8a86-1f46-481f-a96f-9a5958eff1a3/screenshots/mobile_drawer_open_m110.png",
	});

	// Click nav link to navigate and auto-close drawer
	await drawer.getByRole("link", { name: "Keno" }).click();
	await expect(page).toHaveURL(/.*\/keno/);
	await expect(page.getByTestId("mobile-nav-drawer")).toHaveCount(0);
});

test("UserManagement, SalaryReport, EmployeeRoster, and Admin maintain responsive containment without overflow", async ({
	page,
}) => {
	await prepareAuthenticatedPage(page);

	for (const viewport of [
		{ width: 375, height: 812 },
		{ width: 768, height: 1024 },
	]) {
		await page.setViewportSize(viewport);

		// 1. UserManagement table is encapsulated in overflow-x-auto and main has no horizontal overflow
		await page.goto("/admin/users");
		const staffCard = page.locator(".rounded-xl", {
			hasText: "Staff Accounts",
		});
		await expect(staffCard).toBeVisible();
		const tableWrapper = staffCard.locator(".overflow-x-auto");
		await expect(tableWrapper).toBeVisible();
		await expect(
			page.evaluate(() => {
				const main = document.querySelector("main");
				return main ? main.scrollWidth <= main.clientWidth + 1 : true;
			}),
		).resolves.toBe(true);

		// 2. SalaryReport date controls wrap without blowing out main container
		await page.goto("/salary-report");
		await expect(
			page.getByRole("heading", { name: "Payroll & Salary Payout Report" }),
		).toBeVisible();
		await expect(
			page.evaluate(() => {
				const main = document.querySelector("main");
				return main ? main.scrollWidth <= main.clientWidth + 1 : true;
			}),
		).resolves.toBe(true);

		// 3. EmployeeRoster staff card wraps cleanly without horizontal overflow
		await page.goto("/admin/employees");
		await expect(
			page.getByRole("heading", { name: "Employee Roster" }),
		).toBeVisible();
		await expect(
			page.evaluate(() => {
				const main = document.querySelector("main");
				return main ? main.scrollWidth <= main.clientWidth + 1 : true;
			}),
		).resolves.toBe(true);

		// 4. Admin rate rows remain contained within viewport
		await page.goto("/admin");
		await expect(
			page.getByRole("heading", { name: "Admin Settings" }),
		).toBeVisible();
		await expect(
			page.evaluate(() => {
				const main = document.querySelector("main");
				return main ? main.scrollWidth <= main.clientWidth + 1 : true;
			}),
		).resolves.toBe(true);
	}
});

test("Reports and Expenses maintain responsive containment across mobile and tablet viewports", async ({
	page,
}) => {
	await prepareAuthenticatedPage(page);

	for (const viewport of [
		{ width: 320, height: 568 },
		{ width: 375, height: 812 },
		{ width: 768, height: 1024 },
		{ width: 1280, height: 800 },
	]) {
		await page.setViewportSize(viewport);

		// 1. Reports page header and date controls do not overflow
		await page.goto("/reports");
		await expect(
			page.getByRole("heading", { name: "Historical Reports" }),
		).toBeVisible();
		const reportsNoOverflow = await page.evaluate(() => {
			const main = document.querySelector("main");
			return main ? main.scrollWidth <= main.clientWidth + 1 : true;
		});
		expect(reportsNoOverflow, `Reports overflowed at ${viewport.width}px`).toBe(
			true,
		);

		// 2. Expenses history card header controls do not overflow
		await page.goto("/expenses");
		await expect(
			page.getByRole("heading", { name: "Log Expenses" }),
		).toBeVisible();
		const expensesNoOverflow = await page.evaluate(() => {
			const main = document.querySelector("main");
			return main ? main.scrollWidth <= main.clientWidth + 1 : true;
		});
		expect(
			expensesNoOverflow,
			`Expenses overflowed at ${viewport.width}px`,
		).toBe(true);
	}
});
