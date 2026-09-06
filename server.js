/**
 * server.js — Phusion Passenger Bootstrap Bridge for cPanel
 *
 * Supported as the default entry point in cPanel's "Setup Node.js App" UI.
 * Asynchronously imports the compiled ES module server entry point.
 */

async function bootstrap() {
	await import("./packages/server/dist/index.js");
}

bootstrap().catch((err) => {
	console.error("[Passenger Bootstrap Error]:", err);
	process.exit(1);
});
