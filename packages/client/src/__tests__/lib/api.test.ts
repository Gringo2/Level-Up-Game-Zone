/**
 * api.ts references `window` at module top-level (API_BASE fallback), so it
 * requires the jsdom environment even though safeJson itself is pure.
 * @vitest-environment jsdom
 */
import { describe, expect, it } from "vitest";
import { API_BASE, safeJson } from "../../lib/api.js";

function jsonResponse(body: unknown, contentType = "application/json") {
	return new Response(JSON.stringify(body), {
		status: 200,
		headers: { "Content-Type": contentType },
	});
}

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
