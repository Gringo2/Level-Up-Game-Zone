import { existsSync } from "node:fs";
import path from "node:path";
import { type Express, static as expressStatic } from "express";

// TD-019: serve the built client (packages/client/dist) with an SPA fallback.
// Inert unless the dist directory exists, so dev/test flows are untouched and
// /api/* always takes precedence over the fallback.
export function registerClientStatic(app: Express, clientDist: string): void {
	const distDir = path.resolve(clientDist);
	if (!existsSync(distDir)) {
		return;
	}

	app.use(expressStatic(distDir));

	app.get("*", (req, res, next) => {
		if (req.path.startsWith("/api")) {
			next();
			return;
		}
		res.sendFile(path.join(distDir, "index.html"));
	});
}
