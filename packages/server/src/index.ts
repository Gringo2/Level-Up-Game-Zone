import cors from "cors";
import dotenv from "dotenv";
import express, {
	type NextFunction,
	type Request,
	type Response,
} from "express";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

import auditLogsRoutes from "./routes/auditLogs.js";
import creditsRoutes from "./routes/credits.js";
import employeesRoutes from "./routes/employees.js";
import expensesRoutes from "./routes/expenses.js";
import kenoRoutes from "./routes/keno.js";
import ratesRoutes from "./routes/rates.js";
import salesRoutes from "./routes/sales.js";
import shiftRoutes from "./routes/shifts.js";
import usersRoutes from "./routes/users.js";

// Health check endpoint
app.get("/api/health", (_req, res) => {
	res.json({ status: "ok", message: "Server is running properly!" });
});

app.use("/api/shifts", shiftRoutes);
app.use("/api/sales", salesRoutes);
app.use("/api/keno", kenoRoutes);
app.use("/api/expenses", expensesRoutes);
app.use("/api/rates", ratesRoutes);
app.use("/api/credits", creditsRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/employees", employeesRoutes);
app.use("/api/audit-logs", auditLogsRoutes);

// Global Express error handler — must be registered after all routes
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
	console.error("[Express Error]", err.message);
	res.status(500).json({ error: "Internal server error" });
});

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
