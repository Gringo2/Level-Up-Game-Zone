import cors from "cors";
import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import "./setupTests.js";
import app from "../app.js";
import {
	buildApiRateLimit,
	buildCorsOptions,
	buildMutationRateLimit,
	parseAllowedOrigins,
} from "../middleware/security.js";

describe("TD-010 CORS allowlist", () => {
	it("echoes Access-Control-Allow-Origin for an allowlisted origin", async () => {
		const response = await request(app)
			.get("/api/health")
			.set("Origin", "http://localhost:3002");

		expect(response.status).toBe(200);
		expect(response.headers["access-control-allow-origin"]).toBe(
			"http://localhost:3002",
		);
	});

	it("withholds Access-Control-Allow-Origin for a disallowed origin", async () => {
		const response = await request(app)
			.get("/api/health")
			.set("Origin", "http://evil.example");

		expect(response.headers["access-control-allow-origin"]).toBeUndefined();
	});

	it("permits non-browser requests without an Origin header", async () => {
		const response = await request(app).get("/api/health");

		expect(response.status).toBe(200);
	});

	it("answers preflight from an allowlisted origin", async () => {
		const response = await request(app)
			.options("/api/health")
			.set("Origin", "http://localhost:3000")
			.set("Access-Control-Request-Method", "GET");

		expect(response.headers["access-control-allow-origin"]).toBe(
			"http://localhost:3000",
		);
	});

	it("denies preflight from a disallowed origin", async () => {
		const response = await request(app)
			.options("/api/health")
			.set("Origin", "http://evil.example")
			.set("Access-Control-Request-Method", "GET");

		expect(response.headers["access-control-allow-origin"]).toBeUndefined();
	});

	it("parses CORS_ORIGINS env into trimmed list", () => {
		expect(parseAllowedOrigins(" http://a.dev , http://b.dev ,,")).toEqual([
			"http://a.dev",
			"http://b.dev",
		]);
	});

	it("falls back to loopback dev defaults when env unset", () => {
		const defaults = parseAllowedOrigins(undefined);
		expect(defaults).toContain("http://localhost:3002");
		expect(defaults).toContain("http://localhost:3000");
		expect(defaults).toContain("http://localhost:5173");
	});

	it("buildCorsOptions rejects unknown origins and accepts known ones", async () => {
		const probe = express();
		probe.use(cors(buildCorsOptions(["http://known.dev"])));
		probe.get("/ping", (_req, res) => {
			res.json({ ok: true });
		});

		const allowed = await request(probe)
			.get("/ping")
			.set("Origin", "http://known.dev");
		expect(allowed.headers["access-control-allow-origin"]).toBe(
			"http://known.dev",
		);

		const denied = await request(probe)
			.get("/ping")
			.set("Origin", "http://unknown.dev");
		expect(denied.headers["access-control-allow-origin"]).toBeUndefined();
	});
});

describe("TD-012 security headers (helmet)", () => {
	it("sets X-Content-Type-Options nosniff on API responses", async () => {
		const response = await request(app).get("/api/health");

		expect(response.headers["x-content-type-options"]).toBe("nosniff");
	});

	it("sets a frameguard policy on API responses", async () => {
		const response = await request(app).get("/api/health");

		expect(response.headers["x-frame-options"]).toBeDefined();
	});
});

describe("TD-011 rate limiting", () => {
	it("mounts draft-7 RateLimit headers on the live app", async () => {
		const response = await request(app).get("/api/health");

		expect(response.headers["ratelimit-policy"]).toBeDefined();
		expect(response.headers.ratelimit).toContain("limit=");
	});

	it("returns 429 once the configured limit is exhausted", async () => {
		const probe = express();
		probe.use(
			"/api",
			buildMutationRateLimit(buildApiRateLimit({ windowMs: 60_000, max: 2 })),
		);
		probe.post("/api/ping", (_req, res) => {
			res.json({ ok: true });
		});

		expect((await request(probe).post("/api/ping")).status).toBe(200);
		expect((await request(probe).post("/api/ping")).status).toBe(200);

		const blocked = await request(probe).post("/api/ping");
		expect(blocked.status).toBe(429);
		expect(blocked.body.error).toBe(
			"Too many requests, please try again later.",
		);
	});

	it("does not count safe verbs against the mutation budget", async () => {
		const probe = express();
		probe.use(
			"/api",
			buildMutationRateLimit(buildApiRateLimit({ windowMs: 60_000, max: 1 })),
		);
		probe.get("/api/ping", (_req, res) => {
			res.json({ ok: true });
		});
		probe.post("/api/ping", (_req, res) => {
			res.json({ ok: true });
		});

		for (let i = 0; i < 5; i += 1) {
			expect((await request(probe).get("/api/ping")).status).toBe(200);
		}

		expect((await request(probe).post("/api/ping")).status).toBe(200);
		expect((await request(probe).post("/api/ping")).status).toBe(429);
	});
});
