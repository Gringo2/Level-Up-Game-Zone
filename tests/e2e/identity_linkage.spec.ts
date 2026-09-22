import { expect, test } from "@playwright/test";

test.describe("Identity Linkage & Collision Prevention", () => {
	const mockUsers = [
		{
			uid: "user-alice",
			email: "alice@example.com",
			displayName: "Alice Smith",
			role: "staff",
			created_at: new Date().toISOString(),
		},
		{
			uid: "user-bob",
			email: "bob@example.com",
			displayName: "Bob Jones",
			role: "staff",
			created_at: new Date().toISOString(),
		},
		{
			uid: "admin1",
			email: "admin@example.com",
			displayName: "Admin Boss",
			role: "admin",
			created_at: new Date().toISOString(),
		},
	];

	const mockEmployees = [
		{
			id: "emp-alice",
			name: "Alice Worker",
			position: "Senior Cashier",
			base_salary: 600,
			isActive: true,
			user_uid: "user-alice",
			created_at: new Date().toISOString(),
		},
		{
			id: "emp-charlie",
			name: "Charlie Unlinked",
			position: "Floor Attendant",
			base_salary: 450,
			isActive: true,
			user_uid: null,
			created_at: new Date().toISOString(),
		},
	];

	test("Admin Add Employee selector disables already-linked system accounts", async ({
		page,
	}) => {
		await page.addInitScript(() => {
			// @ts-expect-error
			window.__E2E_USER__ = {
				uid: "admin1",
				email: "admin@example.com",
				displayName: "Admin Boss",
				role: "admin",
			};
		});

		await page.route("**/api/**", async (route) => {
			const url = new URL(route.request().url());
			const path = url.pathname;

			if (path === "/api/users") {
				return route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify(mockUsers),
				});
			}

			if (path === "/api/employees") {
				return route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify(mockEmployees),
				});
			}

			return route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify([]),
			});
		});

		await page.goto("/admin");

		// Add Employee section
		await expect(
			page.getByRole("heading", { name: "Add Store Employee" }),
		).toBeVisible();

		const linkedUserSelect = page.locator("#linkedUser");
		await expect(linkedUserSelect).toBeVisible();

		// Check options
		const unlinkedOption = page.locator('#linkedUser option[value=""]');
		await expect(unlinkedOption).toHaveText("None (Unlinked)");
		await expect(unlinkedOption).toBeEnabled();

		// Alice is already linked -> option should be disabled and show helper suffix
		const aliceOption = page.locator('#linkedUser option[value="user-alice"]');
		await expect(aliceOption).toBeDisabled();
		await expect(aliceOption).toContainText("Already linked to Alice Worker");

		// Bob is unlinked -> option should be enabled
		const bobOption = page.locator('#linkedUser option[value="user-bob"]');
		await expect(bobOption).toBeEnabled();
		await expect(bobOption).not.toContainText("Already linked");
	});

	test("User Management page displays linked employee badges for linked accounts", async ({
		page,
	}) => {
		await page.addInitScript(() => {
			// @ts-expect-error
			window.__E2E_USER__ = {
				uid: "admin1",
				email: "admin@example.com",
				displayName: "Admin Boss",
				role: "admin",
			};
		});

		await page.route("**/api/**", async (route) => {
			const url = new URL(route.request().url());
			const path = url.pathname;

			if (path === "/api/users") {
				return route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify(mockUsers),
				});
			}

			if (path === "/api/employees") {
				return route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify(mockEmployees),
				});
			}

			return route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify([]),
			});
		});

		await page.goto("/admin/users");

		await expect(
			page.getByRole("heading", { name: "Staff Accounts" }),
		).toBeVisible();

		// Alice is linked -> badge "Linked: Alice Worker" must be present
		await expect(page.locator("text=Linked: Alice Worker")).toBeVisible();

		// User Bob is not linked to any employee -> no Linked badge in row
		const bobRow = page.locator("tr", { hasText: "bob@example.com" });
		await expect(bobRow).toBeVisible();
		await expect(bobRow.locator("text=Linked:")).not.toBeVisible();
	});

	test("Employee Roster page displays linked account badge and allows editing with collision prevention", async ({
		page,
	}) => {
		await page.addInitScript(() => {
			// @ts-expect-error
			window.__E2E_USER__ = {
				uid: "admin1",
				email: "admin@example.com",
				displayName: "Admin Boss",
				role: "admin",
			};
		});

		await page.route("**/api/**", async (route) => {
			const url = new URL(route.request().url());
			const path = url.pathname;

			if (path === "/api/users") {
				return route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify(mockUsers),
				});
			}

			if (path === "/api/employees") {
				return route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify(mockEmployees),
				});
			}

			return route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify([]),
			});
		});

		await page.goto("/admin/employees");

		await expect(
			page.getByRole("heading", { name: "Current Staff Roster" }),
		).toBeVisible();

		// Alice header displays linked account badge
		const aliceHeader = page.locator("div.flex.items-center.gap-2", {
			hasText: "Alice Worker",
		});
		await expect(
			aliceHeader.locator("text=Account: alice@example.com"),
		).toBeVisible();

		// Charlie header does not have an Account badge
		const charlieHeader = page.locator("div.flex.items-center.gap-2", {
			hasText: "Charlie Unlinked",
		});
		await expect(charlieHeader.locator("text=Account:")).not.toBeVisible();

		// Click Edit on Alice Worker (first Edit button in the roster list)
		await page.getByRole("button", { name: "Edit" }).first().click();

		// Edit form opened
		const editUserSelect = page.locator("#edit-user-uid");
		await expect(editUserSelect).toBeVisible();
		await expect(editUserSelect).toHaveValue("user-alice");

		// Bob is unlinked, so available in dropdown
		const editBobOption = page.locator(
			'#edit-user-uid option[value="user-bob"]',
		);
		await expect(editBobOption).toBeEnabled();
		await expect(editBobOption).not.toContainText("Already linked");
	});
});
