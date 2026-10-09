import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
	bootHarness,
	call,
	createAccount,
	createMember,
	type Harness,
	ROOT_EMAIL,
	resetEmulators,
} from "./harness.js";

// M-134 / ACP-042: the membership gate (M-132) with real Auth-emulator tokens.
let h: Harness;

describe("membership with real tokens (real SDK + emulators)", () => {
	beforeAll(async () => {
		h = await bootHarness();
	});
	beforeEach(resetEmulators);

	it("blocks an account that has no user record, and lets it read its registration state", async () => {
		const stranger = await createAccount("stranger@test.local");
		for (const path of [
			"/api/credits",
			"/api/expenses",
			"/api/sales",
			"/api/shifts",
			"/api/employees",
			"/api/rates",
			"/api/keno",
			"/api/sports-betting",
		]) {
			const res = await call(h.app, "get", path, stranger.token);
			expect(res.status, path).toBe(403);
		}
		expect(
			(await call(h.app, "get", "/api/users/me", stranger.token)).status,
		).toBe(404);
		expect(
			(await call(h.app, "post", "/api/users", stranger.token, {})).status,
		).toBe(403); // not invited
	});

	it("rejects missing and garbage tokens before looking at membership", async () => {
		expect((await call(h.app, "get", "/api/credits", null)).status).toBe(401);
		expect(
			(await call(h.app, "get", "/api/credits", "not-a-token")).status,
		).toBe(401);
	});

	it("runs the whole onboarding: root bootstrap, invite, registration, use, removal", async () => {
		const root = await createAccount(ROOT_EMAIL);
		const boot = await call(h.app, "post", "/api/users", root.token, {});
		expect(boot.status).toBe(201);
		expect(boot.body.role).toBe("admin");

		const invited = await call(h.app, "post", "/api/users/invite", root.token, {
			email: "newhire@test.local",
			role: "staff",
		});
		expect([200, 201]).toContain(invited.status);

		const hire = await createAccount("newhire@test.local");
		const registered = await call(h.app, "post", "/api/users", hire.token, {});
		expect(registered.status).toBe(201);
		expect(registered.body.role).toBe("staff");
		expect((await call(h.app, "get", "/api/credits", hire.token)).status).toBe(
			200,
		);
		expect(
			(await call(h.app, "get", "/api/audit-logs", hire.token)).status,
		).toBe(403); // staff cannot read the activity log
		expect(
			(await call(h.app, "get", "/api/audit-logs", root.token)).status,
		).toBe(200);

		const removed = await call(
			h.app,
			"delete",
			`/api/users/${hire.uid}`,
			root.token,
			{ deleteReason: "left the shop" },
		);
		expect(removed.status).toBe(200);
		expect((await call(h.app, "get", "/api/credits", hire.token)).status).toBe(
			403,
		); // locked out on the next request
		expect((await h.db.collection("users").doc(hire.uid).get()).exists).toBe(
			false,
		);
	});

	it("applies role changes on the very next request and guards the last admin", async () => {
		const root = await createMember(h.db, ROOT_EMAIL, "admin", "Root");
		const second = await createMember(h.db, "ada@test.local", "admin", "Ada");
		const staff = await createMember(h.db, "sam@test.local", "staff", "Sam");
		expect(
			(
				await call(h.app, "post", "/api/sports-betting", staff.token, {
					net_profit: 5,
				})
			).status,
		).toBe(403);
		const promote = await call(
			h.app,
			"put",
			`/api/users/${staff.uid}/role`,
			root.token,
			{ role: "manager", editReason: "shift lead" },
		);
		expect(promote.status).toBe(200);
		expect(
			(
				await call(h.app, "post", "/api/sports-betting", staff.token, {
					net_profit: 5,
				})
			).status,
		).toBe(201);
		expect(
			(
				await call(h.app, "put", `/api/users/${root.uid}/role`, root.token, {
					role: "staff",
					editReason: "self demote",
				})
			).status,
		).toBe(400);
		expect(
			(
				await call(h.app, "put", `/api/users/${root.uid}/role`, second.token, {
					role: "staff",
					editReason: "demote root",
				})
			).status,
		).toBe(400);
	});
});
