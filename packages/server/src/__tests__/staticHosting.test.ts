import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import express from "express";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { registerClientStatic } from "../staticHosting.js";

describe("TD-019: client static hosting", () => {
	let distDir: string;

	beforeEach(() => {
		distDir = mkdtempSync(path.join(tmpdir(), "client-dist-"));
		writeFileSync(
			path.join(distDir, "index.html"),
			"<html><body>SPA</body></html>",
		);
		writeFileSync(path.join(distDir, "asset.js"), "console.log(1)");
		mkdirSync(path.join(distDir, "assets"), { recursive: true });
		writeFileSync(path.join(distDir, "assets", "chunk.css"), "body{color:red}");
	});

	afterEach(() => {
		rmSync(distDir, { recursive: true, force: true });
	});

	it("serves index.html at /", async () => {
		const app = express();
		registerClientStatic(app, distDir);
		const res = await request(app).get("/");
		expect(res.status).toBe(200);
		expect(res.headers["content-type"]).toContain("text/html");
		expect(res.text).toContain("SPA");
	});

	it("serves hashed assets", async () => {
		const app = express();
		registerClientStatic(app, distDir);
		const res = await request(app).get("/assets/chunk.css");
		expect(res.status).toBe(200);
		expect(res.text).toContain("color:red");
	});

	it("SPA-falls-back unknown client routes to index.html", async () => {
		const app = express();
		registerClientStatic(app, distDir);
		const res = await request(app).get("/some/client/route");
		expect(res.status).toBe(200);
		expect(res.headers["content-type"]).toContain("text/html");
	});

	it("hands /api requests to later handlers instead of the SPA fallback", async () => {
		const app = express();
		app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
		registerClientStatic(app, distDir);
		let apiFallbackReached = false;
		app.use("/api", (_req, res) => {
			apiFallbackReached = true;
			res.status(404).json({ error: "Not found" });
		});

		const api = await request(app).get("/api/health");
		expect(api.status).toBe(200);
		expect(api.headers["content-type"]).toContain("application/json");

		const unknownApi = await request(app).get("/api/does-not-exist");
		expect(apiFallbackReached).toBe(true);
		expect(unknownApi.headers["content-type"]).toContain("application/json");
	});

	it("is inert when the dist directory does not exist", async () => {
		const app = express();
		app.get("/api/health", (_req, res) => res.json({ ok: true }));
		expect(() =>
			registerClientStatic(app, path.join(distDir, "..", "nope")),
		).not.toThrow();
		const res = await request(app).get("/any");
		expect(res.status).toBe(404);
	});
});
