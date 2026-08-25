import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as dotenv from "dotenv";
import { cert, getApp, getApps, initializeApp } from "firebase-admin";
import { getAuth } from "firebase-admin/auth";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// To connect to a real Firebase project locally, you will need a Service Account Key.
// 1. Go to Firebase Console -> Project Settings -> Service Accounts
// 2. Generate New Private Key
// 3. Save it to packages/server/serviceAccountKey.json (ADD THIS TO .gitignore!)
// Resolution order (TD-021): GOOGLE_APPLICATION_CREDENTIALS > SERVICE_ACCOUNT_KEY_PATH
// > the legacy repo-relative key file.

import { getFirestore } from "firebase-admin/firestore";

export class FirebaseConfigError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "FirebaseConfigError";
	}
}

export function resolveCredentialPath(
	env: NodeJS.ProcessEnv = process.env,
): string {
	if (env.GOOGLE_APPLICATION_CREDENTIALS) {
		return env.GOOGLE_APPLICATION_CREDENTIALS;
	}
	if (env.SERVICE_ACCOUNT_KEY_PATH) {
		return env.SERVICE_ACCOUNT_KEY_PATH;
	}
	return path.join(__dirname, "../serviceAccountKey.json");
}

export function readServiceAccount(filePath: string): Record<string, unknown> {
	let raw: string;
	try {
		raw = readFileSync(filePath, "utf8");
	} catch {
		throw new FirebaseConfigError(
			`Server cannot start: service-account key not readable at "${filePath}". ` +
				`Set GOOGLE_APPLICATION_CREDENTIALS or SERVICE_ACCOUNT_KEY_PATH to the key file, ` +
				`or place serviceAccountKey.json at packages/server/. See README "Setup".`,
		);
	}

	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch {
		throw new FirebaseConfigError(
			`Server cannot start: "${filePath}" is not valid JSON. Re-export the service-account key from Firebase Console.`,
		);
	}

	if (
		typeof parsed !== "object" ||
		parsed === null ||
		!("project_id" in parsed)
	) {
		throw new FirebaseConfigError(
			`Server cannot start: "${filePath}" does not look like a service-account key (missing project_id).`,
		);
	}

	return parsed as Record<string, unknown>;
}

if (!getApps().length) {
	initializeApp({
		credential: cert(
			readServiceAccount(resolveCredentialPath()) as Parameters<typeof cert>[0],
		),
	});
}

// TD-016: the server no longer reads the client's firebase-applet-config.json.
// A named Firestore database is opted into via FIRESTORE_DATABASE_ID; when
// unset, the project's (default) database is used.
export const db = process.env.FIRESTORE_DATABASE_ID
	? getFirestore(getApp(), process.env.FIRESTORE_DATABASE_ID)
	: getFirestore();

export const auth = getAuth(getApp());
