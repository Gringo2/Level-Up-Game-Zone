import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
	testDir: "./tests/e2e",
	fullyParallel: true,
	reporter: "html",
	use: {
		trace: "on-first-retry",
		baseURL: "http://localhost:3000",
	},
	projects: [
		{
			name: "chromium",
			use: { ...devices["Desktop Chrome"] },
		},
	],
	webServer: {
		command: "npm run dev",
		port: 3000,
		reuseExistingServer: false,
		timeout: 120 * 1000,
	},
});
