import app from "./app.js";

const PORT = process.env.PORT || 4000;

const server = app.listen(PORT, () => {
	console.log(`🚀 Server listening on http://localhost:${PORT}`);
});

// Graceful shutdown on container/process signals
const shutdown = (signal: string) => {
	console.log(`[${signal}] Shutting down gracefully…`);
	server.close(() => {
		console.log("Server closed.");
		process.exit(0);
	});
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

// Process-level safety nets
process.on("unhandledRejection", (reason) => {
	console.error("[UnhandledRejection]", reason);
});

process.on("uncaughtException", (err) => {
	console.error("[UncaughtException]", err.message);
	process.exit(1);
});
