import app from "./app.js";
import { logger } from "./utils/logger.js";

const PORT = process.env.PORT || 4001;

const server = app.listen(PORT, () => {
	logger.info(`🚀 Server listening on http://localhost:${PORT}`);
});

// Graceful shutdown on container/process signals
const shutdown = (signal: string) => {
	logger.info(`[${signal}] Shutting down gracefully…`);
	server.close(() => {
		logger.info("Server closed.");
		process.exit(0);
	});
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

// Process-level safety nets
process.on("unhandledRejection", (reason) => {
	logger.error({ reason }, "[UnhandledRejection]");
});

process.on("uncaughtException", (err) => {
	logger.error({ err }, "[UncaughtException]");
	process.exit(1);
});
