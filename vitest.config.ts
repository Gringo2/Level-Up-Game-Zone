import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "packages/client"),
		},
	},
	test: {
		environment: "node",
		globals: true,
		include: ["packages/**/*.{test,spec}.{ts,tsx}"],
		coverage: {
			provider: "v8",
			include: ["packages/client/src/**/*.{ts,tsx}"],
			exclude: [
				"**/*.d.ts",
				"**/main.tsx",
				"**/firebase.ts",
				"**/__tests__/**",
			],
			thresholds: {
				// Client coverage is gated per tested area. Layouts are
				// deliberately not unit-tested (covered by the Playwright e2e
				// suite). Pages are gated at the M-45 cohort floor (5 of 10 pages
				// covered; raised as the remaining pages are covered in later
				// missions). Thresholds set empirically from measured coverage.
				"packages/client/src/lib/**": { lines: 95, functions: 95 },
				"packages/client/src/contexts/**": { lines: 70, functions: 85 },
				"packages/client/src/components/**": { lines: 30, functions: 30 },
				"packages/client/src/pages/**": { lines: 40, functions: 35 },
			},
		},
	},
});
