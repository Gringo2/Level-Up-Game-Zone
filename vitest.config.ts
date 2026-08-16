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
				// Client coverage is gated per tested area. Thresholds set
				// empirically from measured coverage after full suite runs.
				"packages/client/src/lib/**": { lines: 95, functions: 95 },
				"packages/client/src/contexts/**": { lines: 70, functions: 85 },
				"packages/client/src/components/**": { lines: 80, functions: 90 },
				"packages/client/src/pages/**": { lines: 80, functions: 85 },
				"packages/client/src/layouts/**": { lines: 90, functions: 100 },
			},
		},
	},
});
