import { generateKeyPairSync } from "node:crypto";
import type { Express } from "express";
import request from "supertest";

// M-134 / ACP-042: boots the REAL Express app with the REAL firebase-admin SDK
// against the Firebase emulators. Nothing here mocks application code.

// CLOCK RULE: tests pin time with vi.useFakeTimers({ toFake: ["Date"] }). Emulator
// ID tokens carry real timestamps, so a pinned time must be EARLIER than the real
// clock (a token only fails once it is more than an hour past issue).

export const ROOT_EMAIL = "root@test.local";

const emulatorProject = (): string => {
	const project = process.env.GCLOUD_PROJECT ?? "";
	// Safety guard: never run against anything but an emulated demo project.
	if (
		!process.env.FIRESTORE_EMULATOR_HOST ||
		!process.env.FIREBASE_AUTH_EMULATOR_HOST ||
		!project.startsWith("demo-")
	) {
		throw new Error(
			"Integration tests only run against the Firebase emulators with a demo- project. Use `npm run test:integration`.",
		);
	}
	return project;
};

export type Harness = {
	app: Express;
	db: FirebaseFirestore.Firestore;
};

export async function bootHarness(): Promise<Harness> {
	const project = emulatorProject();
	const { privateKey } = generateKeyPairSync("rsa", {
		modulusLength: 2048,
		privateKeyEncoding: { type: "pkcs8", format: "pem" },
		publicKeyEncoding: { type: "spki", format: "pem" },
	});
	// A throwaway key for a demo project. Empty strings stop dotenv from
	// loading real credentials or a named database from a local .env.
	process.env.FIREBASE_SERVICE_ACCOUNT_KEY = JSON.stringify({
		type: "service_account",
		project_id: project,
		private_key_id: "integration",
		private_key: privateKey,
		client_email: `integration@${project}.iam.gserviceaccount.com`,
		client_id: "1",
	});
	process.env.FIRESTORE_DATABASE_ID = "";
	process.env.GOOGLE_APPLICATION_CREDENTIALS = "";
	process.env.SERVICE_ACCOUNT_KEY_PATH = "";
	process.env.ROOT_ADMIN_EMAILS = ROOT_EMAIL;
	process.env.API_RATE_LIMIT_MAX = "1000000";
	process.env.MUTATION_RATE_LIMIT_MAX = "1000000";

	const { default: app } = await import("../../app.js");
	const { db } = await import("../../firebase.js");
	return { app, db };
}

export async function resetEmulators(): Promise<void> {
	const project = emulatorProject();
	const results = await Promise.all([
		fetch(
			`http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/${project}/databases/(default)/documents`,
			{ method: "DELETE" },
		),
		fetch(
			`http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/emulator/v1/projects/${project}/accounts`,
			{ method: "DELETE" },
		),
	]);
	for (const r of results) {
		if (!r.ok) throw new Error(`Emulator reset failed: ${r.status}`);
	}
}

export type Account = { uid: string; email: string; token: string };

/** Creates a real account in the Auth emulator and returns a real ID token. */
export async function createAccount(email: string): Promise<Account> {
	emulatorProject();
	const response = await fetch(
		`http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake`,
		{
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ email, password: "pass1234" }),
		},
	);
	const body = (await response.json()) as { idToken: string; localId: string };
	return { uid: body.localId, email, token: body.idToken };
}

/** A member: a real account plus its users/{uid} record (seeded directly). */
export async function createMember(
	db: FirebaseFirestore.Firestore,
	email: string,
	role: "admin" | "manager" | "staff",
	displayName = email.split("@")[0],
): Promise<Account> {
	const account = await createAccount(email);
	await db
		.collection("users")
		.doc(account.uid)
		.set({ email, displayName, role, created_at: new Date().toISOString() });
	return account;
}

export const call = (
	app: Express,
	method: "get" | "post" | "put" | "delete",
	path: string,
	token: string | null,
	body?: Record<string, unknown>,
) => {
	let req = request(app)[method](path);
	if (token) req = req.set("Authorization", `Bearer ${token}`);
	return body === undefined ? req : req.send(body);
};

/** Exactly what the entry forms send for a chosen day: midnight UTC. */
export const formDate = (ymd: string): string => new Date(ymd).toISOString();
