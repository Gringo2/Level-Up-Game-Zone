/**
 * api.ts references `window` at module top-level (API_BASE fallback), so it
 * requires the jsdom environment even though safeJson itself is pure.
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	API_BASE,
	authFetch,
	listFromPayload,
	resolveApiBase,
	safeJson,
} from "../../lib/api.js";

vi.mock("../../firebase.js", () => {
	const mockUser = {
		getIdToken: vi.fn().mockResolvedValue("mock-token"),
	};
	return {
		auth: { currentUser: mockUser },
	};
});

vi.mock("firebase/auth", () => ({
	signOut: vi.fn().mockResolvedValue(undefined),
}));

function jsonResponse(body: unknown, contentType = "application/json") {
	return new Response(JSON.stringify(body), {
		status: 200,
		headers: { "Content-Type": contentType },
	});
}

describe("listFromPayload (TD-032)", () => {
	const rows = [{ id: "a" }, { id: "b" }];

	it("passes legacy bare arrays through untouched", () => {
		expect(listFromPayload(rows)).toEqual(rows);
	});

	it("unwraps the { data, nextCursor } envelope", () => {
		expect(listFromPayload({ data: rows, nextCursor: "cursor-1" })).toEqual(
			rows,
		);
	});
});

describe("safeJson", () => {
	it("resolves a base URL against the runtime hostname", () => {
		expect(API_BASE).toMatch(/^https?:\/\//);
	});

	it("parses and returns the JSON body for an application/json response", async () => {
		const res = jsonResponse({ ok: true, count: 3 });
		await expect(safeJson(res)).resolves.toEqual({ ok: true, count: 3 });
	});

	it("returns an empty object when the content-type is not JSON (e.g. HTML gateway error)", async () => {
		const res = new Response("<html>502 Bad Gateway</html>", {
			status: 502,
			headers: { "Content-Type": "text/html" },
		});
		await expect(safeJson(res)).resolves.toEqual({});
	});

	it("returns an empty object when the content-type header is absent", async () => {
		const res = new Response("plain body", { status: 200 });
		await expect(safeJson(res)).resolves.toEqual({});
	});

	it("surfaces the server error field on the returned payload", async () => {
		const res = jsonResponse({ error: "User already exists" });
		const data = await safeJson(res);
		expect(data.error).toBe("User already exists");
	});
});

describe("resolveApiBase (TD-015)", () => {
	it("uses VITE_API_URL when set, regardless of host", () => {
		expect(resolveApiBase("https://api.example.com", "store.example.com")).toBe(
			"https://api.example.com",
		);
	});

	it("falls back to plaintext http only for loopback dev hosts", () => {
		expect(resolveApiBase(undefined, "localhost")).toBe(
			"http://localhost:4001",
		);
		expect(resolveApiBase(undefined, "127.0.0.1")).toBe(
			"http://127.0.0.1:4001",
		);
	});

	it("refuses the plaintext fallback for non-loopback hosts", () => {
		expect(() => resolveApiBase(undefined, "store.example.com")).toThrow(
			/VITE_API_URL is required/,
		);
	});
});

describe("authFetch", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("attaches Bearer token and returns the response", async () => {
		const fetchSpy = vi
			.spyOn(global, "fetch")
			.mockResolvedValue(jsonResponse({ ok: true }));

		const res = await authFetch("http://localhost:4001/api/test");
		expect(res.status).toBe(200);
		expect(fetchSpy).toHaveBeenCalledWith(
			"http://localhost:4001/api/test",
			expect.objectContaining({
				headers: expect.any(Headers),
			}),
		);

		const sentHeaders = fetchSpy.mock.calls[0][1]?.headers as Headers;
		expect(sentHeaders.get("Authorization")).toBe("Bearer mock-token");
	});

	it("signs out and throws on 401 response", async () => {
		vi.spyOn(global, "fetch").mockResolvedValue(
			new Response("Unauthorized", { status: 401 }),
		);
		const { signOut } = await import("firebase/auth");
		const { auth } = await import("../../firebase.js");

		await expect(authFetch("http://localhost:4001/api/test")).rejects.toThrow(
			"Session expired",
		);
		expect(signOut).toHaveBeenCalledWith(auth);
	});

	it("signs out and throws when no user is logged in", async () => {
		const { auth } = await import("../../firebase.js");
		const { signOut } = await import("firebase/auth");
		Object.defineProperty(auth, "currentUser", { value: null, writable: true });

		await expect(authFetch("http://localhost:4001/api/test")).rejects.toThrow(
			"Not authenticated",
		);
		expect(signOut).toHaveBeenCalledWith(auth);

		// Restore
		Object.defineProperty(auth, "currentUser", {
			value: { getIdToken: vi.fn().mockResolvedValue("mock-token") },
			writable: true,
		});
	});
});
