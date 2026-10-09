import {
	afterEach,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import {
	type Account,
	bootHarness,
	call,
	createMember,
	formDate,
	type Harness,
	resetEmulators,
} from "./harness.js";

// M-134 / ACP-042: credits against the real SDK. Guards TD-064 (undefined
// values are rejected by the real SDK) and the resolved_date rules.
const NOW = new Date("2026-10-08T07:00:00.000Z");
let h: Harness;
let manager: Account;

describe("credits (real SDK + emulators)", () => {
	beforeAll(async () => {
		h = await bootHarness();
	});
	beforeEach(async () => {
		await resetEmulators();
		manager = await createMember(
			h.db,
			"mona@test.local",
			"manager",
			"Mona Manager",
		);
		await h.db.collection("employees").doc("e1").set({
			name: "Alice Worker",
			isActive: true,
			base_salary: 3000,
			hired_date: "2026-01-01",
			position: "Cashier",
			break_day: null,
			created_at: "2026-01-01T00:00:00.000Z",
		});
		await h.db.collection("employees").doc("e2").set({
			name: "Gone Guy",
			isActive: false,
			base_salary: 1000,
			hired_date: "2026-01-01",
			position: "Cashier",
			break_day: null,
			created_at: "2026-01-01T00:00:00.000Z",
		});
		vi.useFakeTimers({ toFake: ["Date"] });
		vi.setSystemTime(NOW);
	});
	afterEach(() => vi.useRealTimers());

	const create = (body: Record<string, unknown>) =>
		call(h.app, "post", "/api/credits", manager.token, {
			employee_id: "e1",
			employee_name: "Alice Worker",
			amount: 20,
			date: formDate("2026-10-08"),
			...body,
		});

	it("saves a credit with no reason and stores no reason field", async () => {
		const res = await create({});
		expect(res.status).toBe(201);
		const stored = (
			await h.db.collection("credits").doc(res.body.id).get()
		).data();
		expect(stored).toBeDefined();
		expect("reason" in (stored ?? {})).toBe(false);
		expect(stored).toMatchObject({
			amount: 20,
			status: "Pending",
			employee_id: "e1",
		});
	});

	it("keeps a reason when one is given", async () => {
		const res = await create({ reason: "Bus fare" });
		expect(
			(await h.db.collection("credits").doc(res.body.id).get()).data()?.reason,
		).toBe("Bus fare");
	});

	it("rejects an unknown or inactive employee", async () => {
		expect((await create({ employee_id: "ghost" })).status).toBe(400);
		expect((await create({ employee_id: "e2" })).status).toBe(400);
		expect((await h.db.collection("credits").get()).size).toBe(0);
	});

	it("rejects an invalid date with a 400", async () => {
		const res = await create({ date: "garbage" });
		expect(res.status).toBe(400);
	});

	it("stamps resolved_date for Deducted and removes it when moved back to Pending", async () => {
		const made = await create({});
		const id = made.body.id as string;
		vi.setSystemTime(new Date("2026-10-08T09:00:00.000Z"));
		const deducted = await call(
			h.app,
			"put",
			`/api/credits/${id}`,
			manager.token,
			{ status: "Deducted", editReason: "taken from pay" },
		);
		expect(deducted.status).toBe(200);
		expect(
			(await h.db.collection("credits").doc(id).get()).data()?.resolved_date,
		).toBe("2026-10-08T09:00:00.000Z");

		const back = await call(h.app, "put", `/api/credits/${id}`, manager.token, {
			status: "Pending",
			editReason: "marked by mistake",
		});
		expect(back.status).toBe(200);
		const after = (await h.db.collection("credits").doc(id).get()).data();
		expect(after?.status).toBe("Pending");
		expect("resolved_date" in (after ?? {})).toBe(false);

		// the audit record for the move is legal in the real SDK and has no sentinel
		const audits = (
			await h.db.collection("audit_logs").where("record_id", "==", id).get()
		).docs.map((d) => d.data());
		const reopened = audits.find(
			(a) => a.reason_for_change === "marked by mistake",
		);
		expect(reopened).toBeDefined();
		expect("resolved_date" in (reopened?.new_value ?? {})).toBe(false);
	});
});
