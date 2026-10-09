import { defineConfig } from "vitest/config";

// M-134 / ACP-042: integration suites run the real Express app and the real
// firebase-admin SDK against the Firebase emulators (started by
// `npm run test:integration`). One shared emulator, so files run one at a time.
export default defineConfig({
	test: {
		environment: "node",
		globals: true,
		include: ["packages/server/src/__tests__/integration/**/*.int.test.ts"],
		fileParallelism: false,
		testTimeout: 30000,
		hookTimeout: 60000,
	},
});
