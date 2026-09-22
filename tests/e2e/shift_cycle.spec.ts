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

	test("Manual shift start recovery flow when no active shift is present", async ({
		page,
	}) => {
		await page.addInitScript(() => {
			// @ts-expect-error
			window.__E2E_USER__ = {
				uid: "mgr1",
				email: "manager@example.com",
				displayName: "Manager User",
				role: "manager",
			};
		});

		let shifts: Array<Record<string, unknown>> = [];
		let postPayload: Record<string, unknown> | null = null;

		await page.route("**/api/**", async (route) => {
			const url = new URL(route.request().url());
			const path = url.pathname;
			const method = route.request().method();

			if (path === "/api/shifts" && method === "GET") {
				return route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify(shifts),
				});
			}

			if (path === "/api/shifts/missed" && method === "GET") {
				return route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify({ missedShifts: [], gapDates: ["2026-09-20"] }),
				});
			}

			if (path === "/api/shifts/auto-open" && method === "POST") {
				return route.fulfill({
					status: 409,
					contentType: "application/json",
					body: JSON.stringify({ error: "Shift already closed today" }),
				});
			}

			if (path === "/api/shifts" && method === "POST") {
				postPayload = route.request().postDataJSON();
				const newShift = {
					id: "shift-manual-1",
					manager_id: "mgr1",
					manager_name: "Manager User",
					opening_float: postPayload?.floatAmount ?? 100,
					start_time: new Date().toISOString(),
					status: "OPEN",
				};
				shifts = [newShift];
				return route.fulfill({
					status: 201,
					contentType: "application/json",
					body: JSON.stringify(newShift),
				});
			}

			return route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify([]),
			});
		});

		await page.goto("/");

		// Fallback manual start card asserts
		await expect(
			page.getByRole("heading", { name: "No Active Shift" }),
		).toBeVisible();
		await expect(
			page.locator(
				"text=There is currently no active shift open for the register.",
			),
		).toBeVisible();

		// Open start form
		const startBtn = page.getByRole("button", { name: "Start Shift" });
		await expect(startBtn).toBeVisible();
		await startBtn.click();

		// Form controls visible
		const floatInput = page.locator("#startFloat");
		await expect(floatInput).toBeVisible();

		// Cancel form
		const cancelBtn = page.getByRole("button", { name: "Cancel" });
		await cancelBtn.click();
		await expect(floatInput).not.toBeVisible();
		await expect(startBtn).toBeVisible();

		// Reopen and submit
		await startBtn.click();
		await floatInput.fill("125.50");
		const confirmStartBtn = page.getByRole("button", {
			name: "Confirm & Start Shift",
		});
		await confirmStartBtn.click();

		// Active shift card rendered
		await expect(page.locator("text=Active Shift: Manager User")).toBeVisible();
		expect(postPayload).toEqual(
			expect.objectContaining({
				floatAmount: 125.5,
			}),
		);
	});

	test("Shift closure confirmation modal safeguard prevents accidental close", async ({
		page,
	}) => {
		await page.addInitScript(() => {
			// @ts-expect-error
			window.__E2E_USER__ = {
				uid: "mgr1",
				email: "manager@example.com",
				displayName: "Manager User",
				role: "manager",
			};
		});

		let shiftClosed = false;
		let closePayload: Record<string, unknown> | null = null;
		let currentShifts = [
			{
				id: "shift-to-close",
				manager_id: "mgr1",
				manager_name: "Manager User",
				opening_float: 100,
				start_time: new Date().toISOString(),
				status: "OPEN",
			},
		];

		await page.route("**/api/**", async (route) => {
			const url = new URL(route.request().url());
			const path = url.pathname;
			const method = route.request().method();

			if (path === "/api/shifts" && method === "GET") {
				return route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify(currentShifts),
				});
			}

			if (path === "/api/shifts/missed" && method === "GET") {
				return route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify({ missedShifts: [], gapDates: [] }),
				});
			}

			if (path === "/api/shifts/shift-to-close/close" && method === "POST") {
				shiftClosed = true;
				closePayload = route.request().postDataJSON();
				currentShifts = [];
				return route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify({ message: "Shift closed" }),
				});
			}

			return route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify([]),
			});
		});

		await page.goto("/");
		await expect(page.locator("text=Active Shift: Manager User")).toBeVisible();

		// Open blind count closure form
		await page
			.getByRole("button", { name: "Close Shift (Blind Count)" })
			.click();

		// Fill counted cash with variance: expected $100, actual $85 -> variance -$15 (> $2 threshold)
		const cashInput = page.locator("#closingCash");
		await cashInput.fill("85");

		const reasonInput = page.locator("#reason");
		await expect(reasonInput).toBeVisible();
		await reasonInput.fill("Register drawer shortage counted");

		// Click Confirm & Close Shift -> triggers ConfirmDialog modal
		await page.getByRole("button", { name: "Confirm & Close Shift" }).click();

		// ConfirmDialog modal appears
		const dialogTitle = page.locator("text=Confirm Shift Closure");
		await expect(dialogTitle).toBeVisible();
		await expect(
			page.locator(
				"text=Are you sure you want to close this shift? This will finalize cash reconciliation",
			),
		).toBeVisible();

		// Path 1: Cancel modal -> shift remains open, close endpoint NOT called
		const modal = page.locator("div.fixed.inset-0.z-50");
		const modalCancelBtn = modal.getByRole("button", { name: "Cancel" });
		await modalCancelBtn.click();
		await expect(dialogTitle).not.toBeVisible();
		expect(shiftClosed).toBe(false);

		// Path 2: Re-open modal and confirm
		await page.getByRole("button", { name: "Confirm & Close Shift" }).click();
		await expect(dialogTitle).toBeVisible();

		const confirmCloseBtn = modal.getByRole("button", {
			name: "Yes, Close Shift",
		});
		await confirmCloseBtn.click();

		// Dialog disappears, close endpoint was called, shift transitions to closed
		await expect(dialogTitle).not.toBeVisible();
		expect(shiftClosed).toBe(true);
		expect(closePayload).toEqual({
			actualCashCounted: 85,
			shortageReason: "Register drawer shortage counted",
		});
	});
});
