import type { Page } from "@playwright/test";
import { PINNED_NOW } from "./clock";

// M-134 / ACP-042: helpers for the real-UI flows. Everything goes through the
// real server and the Firebase emulators; nothing here fakes an API response.
export const SERVER = "http://localhost:4011";
const project = process.env.GCLOUD_PROJECT ?? "demo-levelup";
const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST ?? "127.0.0.1:9099";
const firestoreHost = process.env.FIRESTORE_EMULATOR_HOST ?? "127.0.0.1:8085";

export type Person = {
	uid: string;
	email: string;
	displayName: string;
	role: "admin" | "manager" | "staff";
	token: string;
};

async function jsonOrThrow(res: Response, what: string) {
	const text = await res.text();
	if (!res.ok)
		throw new Error(`${what} failed: ${res.status} ${text.slice(0, 200)}`);
	return text ? JSON.parse(text) : null;
}

export async function resetEmulators(): Promise<void> {
	await Promise.all([
		fetch(
			`http://${firestoreHost}/emulator/v1/projects/${project}/databases/(default)/documents`,
			{ method: "DELETE" },
		),
		fetch(`http://${authHost}/emulator/v1/projects/${project}/accounts`, {
			method: "DELETE",
		}),
	]);
}

async function account(email: string): Promise<{ uid: string; token: string }> {
	const res = await fetch(
		`http://${authHost}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake`,
		{
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ email, password: "pass1234" }),
		},
	);
	const body = (await jsonOrThrow(res, "sign up")) as {
		localId: string;
		idToken: string;
	};
	return { uid: body.localId, token: body.idToken };
}

export async function api(
	method: string,
	path: string,
	token: string,
	body?: unknown,
) {
	const res = await fetch(`${SERVER}${path}`, {
		method,
		headers: {
			authorization: `Bearer ${token}`,
			"content-type": "application/json",
		},
		body: body === undefined ? undefined : JSON.stringify(body),
	});
	return { status: res.status, body: await res.json().catch(() => null) };
}

/**
 * Onboards people through the real flows: the root admin bootstraps itself, then
 * invites the others, who register with their own real tokens.
 */
export async function bootstrap(options: { withRates?: boolean } = {}) {
	await resetEmulators();
	const rootAccount = await account("root@test.local");
	const registered = await api("POST", "/api/users", rootAccount.token, {});
	if (registered.status !== 201)
		throw new Error(`root bootstrap failed: ${registered.status}`);
	const admin: Person = {
		...rootAccount,
		email: "root@test.local",
		displayName: "root",
		role: "admin",
	};

	const onboard = async (
		email: string,
		displayName: string,
		role: "manager" | "staff",
	): Promise<Person> => {
		const invite = await api("POST", "/api/users/invite", admin.token, {
			email,
			role,
		});
		if (![200, 201].includes(invite.status))
			throw new Error(`invite failed: ${invite.status}`);
		const acc = await account(email);
		const reg = await api("POST", "/api/users", acc.token, {});
		if (reg.status !== 201)
			throw new Error(`registration failed: ${reg.status}`);
		return {
			...acc,
			email,
			displayName: reg.body.displayName ?? displayName,
			role,
		};
	};
	const manager = await onboard("mona@test.local", "mona", "manager");
	const staff = await onboard("sam@test.local", "sam", "staff");

	if (options.withRates !== false) {
		await api("POST", "/api/rates", admin.token, {
			game_name: "PS4",
			price_per_unit: 5,
			unit_type: "Game",
		});
		await api("POST", "/api/rates", admin.token, {
			game_name: "Pool",
			price_per_unit: 2,
			unit_type: "Game",
		});
	}
	await api("POST", "/api/employees", admin.token, {
		name: "Alice Worker",
		position: "Cashier",
		base_salary: 3000,
		hired_date: "2026-01-01",
	});
	return { admin, manager, staff };
}

/** Opens the real client as a person. The dev session hook shows the shell; the
 * server still verifies a real emulator token, swapped in for the dev one. */
export async function openAs(page: Page, person: Person) {
	// The browser's clock starts at the same pinned moment as the server's.
	await page.clock.install({ time: new Date(PINNED_NOW) });
	await page.addInitScript(
		(u) => {
			(window as unknown as { __E2E_USER__: unknown }).__E2E_USER__ = u;
		},
		{
			uid: person.uid,
			email: person.email,
			displayName: person.displayName,
			role: person.role,
		},
	);
	await page.route(`${SERVER}/api/**`, (route) =>
		route.continue({
			headers: {
				...route.request().headers(),
				authorization: `Bearer ${person.token}`,
			},
		}),
	);
}

type Plain = Record<string, string | number | boolean>;
const toFields = (o: Plain) =>
	Object.fromEntries(
		Object.entries(o).map(([k, v]) => [
			k,
			typeof v === "string"
				? { stringValue: v }
				: typeof v === "number"
					? { doubleValue: v }
					: { booleanValue: v },
		]),
	);

/** Writes a document straight into the emulator (for states the API cannot create, such as an old shift). */
export async function seedDocument(
	collection: string,
	id: string,
	data: Plain,
): Promise<void> {
	const res = await fetch(
		`http://${firestoreHost}/v1/projects/${project}/databases/(default)/documents/${collection}/${id}`,
		{
			method: "PATCH",
			headers: {
				authorization: "Bearer owner",
				"content-type": "application/json",
			},
			body: JSON.stringify({ fields: toFields(data) }),
		},
	);
	await jsonOrThrow(res, `seed ${collection}/${id}`);
}
