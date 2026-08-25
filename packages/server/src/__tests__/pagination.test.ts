import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import "./setupTests.js";
import app from "../app.js";

const { db } = await import("../firebase.js");

// TD-032: cursor pagination on the four business list endpoints.
// Contract: no `limit` -> legacy bare array (back-compat); `limit` present ->
// { data, nextCursor } envelope honoring limit and resuming after cursor.

type Row = Record<string, unknown>;

function mockList(
	path: string,
	docs: Row[],
	capture?: { startAfter?: unknown },
) {
	vi.mocked(db.collection).mockImplementation((col: string) => {
		if (col === "users") {
			return {
				doc: vi.fn().mockReturnValue({
					get: vi.fn().mockResolvedValue({
						exists: true,
						data: () => ({ role: "admin", displayName: "A" }),
					}),
				}),
			} as never;
		}
		if (col !== path) {
			return { doc: vi.fn().mockReturnValue({ id: "x" }) } as never;
		}
		let capped = Number.POSITIVE_INFINITY;
		const chainable = {
			where: vi.fn().mockReturnThis(),
			orderBy: vi.fn().mockReturnThis(),
			limit: vi.fn((n: number) => {
				capped = n;
				return chainable;
			}),
			startAfter: vi.fn((docSnap: unknown) => {
				if (capture) capture.startAfter = docSnap;
				return chainable;
			}),
			get: vi.fn(() =>
				Promise.resolve({
					docs: docs
						.map((d, i) => ({ id: d.id ?? `id-${i}`, data: () => d }))
						.slice(0, capped),
				}),
			),
			doc: vi.fn().mockReturnValue({
				get: vi.fn().mockResolvedValue({ exists: true, id: "cur-9" }),
			}),
		};
		return chainable as never;
	});
}

describe("TD-032: business list pagination", () => {
	const authHeader = "Bearer valid-mock-token";
	const rows: Row[] = [
		{ id: "a", date: "2026-08-03T10:00:00Z" },
		{ id: "b", date: "2026-08-02T10:00:00Z" },
	];

	beforeEach(() => vi.clearAllMocks());

	for (const [endpoint, col] of [
		["sales", "game_sales_logs"],
		["keno", "keno_logs"],
		["expenses", "expenses"],
		["credits", "credits"],
	] as const) {
		it(`${endpoint}: legacy mode returns a bare array when limit is absent`, async () => {
			mockList(col, rows);
			const res = await request(app)
				.get(`/api/${endpoint}`)
				.set("Authorization", authHeader);
			expect(res.status).toBe(200);
			expect(Array.isArray(res.body)).toBe(true);
		});

		it(`${endpoint}: limit returns envelope with nextCursor=null when page is under capacity`, async () => {
			mockList(col, rows);
			const res = await request(app)
				.get(`/api/${endpoint}`)
				.query({ limit: 3 })
				.set("Authorization", authHeader);
			expect(res.status).toBe(200);
			expect(res.body.data).toHaveLength(2);
			expect(res.body.nextCursor).toBeNull();
		});

		it(`${endpoint}: cursor resumes via startAfter and flags nextCursor at capacity`, async () => {
			const capture: { startAfter?: unknown } = {};
			mockList(col, rows, capture);
			const res = await request(app)
				.get(`/api/${endpoint}`)
				.query({ limit: 1, cursor: "cur-9" })
				.set("Authorization", authHeader);
			expect(res.status).toBe(200);
			expect(capture.startAfter).toMatchObject({ id: "cur-9" });
			expect(res.body.data).toHaveLength(1);
			expect(res.body.nextCursor).toBe("a");
		});

		it(`${endpoint}: rejects non-numeric or sub-1 limit (Zod)`, async () => {
			mockList(col, rows);
			const res = await request(app)
				.get(`/api/${endpoint}`)
				.query({ limit: "zero" })
				.set("Authorization", authHeader);
			expect(res.status).toBe(400);
		});
	}
});
