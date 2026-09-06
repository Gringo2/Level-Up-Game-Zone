/**
 * loader.cjs — Phusion Passenger Bootstrap Bridge for cPanel
 *
 * Phusion Passenger's internal Node.js launcher uses CommonJS require()
 * to bootstrap the application. Because @level-up/server is compiled as
 * native ES Modules ("type": "module"), direct execution by Passenger
 * causes ERR_REQUIRE_ESM.
 *
 * This CommonJS loader bridges the boundary by asynchronously importing
 * the compiled server entry point using dynamic import().
 */

async function bootstrap() {
	await import("./packages/server/dist/index.js");
}

bootstrap().catch((err) => {
	console.error("[Passenger Bootstrap Error]:", err);
	process.exit(1);
});
