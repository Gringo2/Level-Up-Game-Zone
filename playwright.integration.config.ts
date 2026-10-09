import { generateKeyPairSync } from "node:crypto";
import { defineConfig, devices } from "@playwright/test";
import { PINNED_NOW } from "./tests/integration/clock";

// M-134 / ACP-042: real-UI flows against the REAL server and the Firebase
// emulators. Started by `npm run test:integration`, which runs this inside
// `firebase emulators:exec` (so the emulator host variables are set).
const SERVER_PORT = 4011;
const CLIENT_PORT = 3012;
const project = process.env.GCLOUD_PROJECT ?? "";

// Safety: without the emulators (and a demo- project) nothing is started and every
// run is refused by the global setup. Loading this file never throws, so tools
// that read config files (Knip) can inspect it.
const emulated = Boolean(
	process.env.FIRESTORE_EMULATOR_HOST &&
		process.env.FIREBASE_AUTH_EMULATOR_HOST &&
		project.startsWith("demo-"),
);

const { privateKey } = generateKeyPairSync("rsa", {
	modulusLength: 2048,
	privateKeyEncoding: { type: "pkcs8", format: "pem" },
	publicKeyEncoding: { type: "spki", format: "pem" },
});

export default defineConfig({
	testDir: "./tests/integration",
	fullyParallel: false,
	workers: 1,
	reporter: "list",
	timeout: 90_000,
	use: {
		baseURL: `http://localhost:${CLIENT_PORT}`,
		trace: "on-first-retry",
	},
	projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
	globalSetup: emulated
		? undefined
		: "./tests/integration/refuse-without-emulator.ts",
	webServer: !emulated
		? []
		: [
				{
					// Real Express server (built by the pretest hook) on a throwaway key.
					command:
						"node --require ./tests/integration/fixed-clock.cjs packages/server/dist/index.js",
					port: SERVER_PORT,
					reuseExistingServer: false,
					timeout: 60_000,
					env: {
						INTEGRATION_NOW: PINNED_NOW,
						PORT: String(SERVER_PORT),
						NODE_ENV: "development",
						CORS_ORIGINS: `http://localhost:${CLIENT_PORT}`,
						FIREBASE_SERVICE_ACCOUNT_KEY: JSON.stringify({
							type: "service_account",
							project_id: project,
							private_key_id: "integration",
							private_key: privateKey,
							client_email: `integration@${project}.iam.gserviceaccount.com`,
							client_id: "1",
						}),
						// Empty values stop dotenv loading real credentials or a named database.
						FIRESTORE_DATABASE_ID: "",
						GOOGLE_APPLICATION_CREDENTIALS: "",
						SERVICE_ACCOUNT_KEY_PATH: "",
						ROOT_ADMIN_EMAILS: "root@test.local",
						API_RATE_LIMIT_MAX: "1000000",
						MUTATION_RATE_LIMIT_MAX: "1000000",
					},
				},
				{
					// Real client dev server. VITE_API_URL overrides .env.local, which points at production.
					command: `npx vite --port=${CLIENT_PORT} --strictPort --host=localhost`,
					cwd: "packages/client",
					port: CLIENT_PORT,
					reuseExistingServer: false,
					timeout: 120_000,
					env: { VITE_API_URL: `http://localhost:${SERVER_PORT}` },
				},
			],
});
