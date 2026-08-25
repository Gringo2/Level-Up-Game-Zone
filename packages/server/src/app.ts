import path from "node:path";
import cors from "cors";
import dotenv from "dotenv";
import express, {
	type NextFunction,
	type Request,
	type Response,
} from "express";
import helmet from "helmet";
import { registerClientStatic } from "./staticHosting.js";

dotenv.config();

import {
	API_RATE_LIMIT_MAX,
	buildApiRateLimit,
	buildCorsOptions,
	buildMutationRateLimit,
	MUTATION_RATE_LIMIT_MAX,
	parseAllowedOrigins,
} from "./middleware/security.js";
import { logger } from "./utils/logger.js";

const app = express();

app.use(helmet());
app.use(cors(buildCorsOptions(parseAllowedOrigins(process.env.CORS_ORIGINS))));
const RATE_LIMIT_WINDOW_MS = Number(
	process.env.RATE_LIMIT_WINDOW_MS ?? 15 * 60 * 1000,
);
app.use(
	"/api",
	buildApiRateLimit({
		windowMs: RATE_LIMIT_WINDOW_MS,
		max: API_RATE_LIMIT_MAX,
	}),
);
app.use(
	"/api",
	buildMutationRateLimit(
		buildApiRateLimit({
			windowMs: RATE_LIMIT_WINDOW_MS,
			max: MUTATION_RATE_LIMIT_MAX,
		}),
	),
);
app.use(express.json());

import auditLogsRoutes from "./routes/auditLogs.js";
import creditsRoutes from "./routes/credits.js";
import employeesRoutes from "./routes/employees.js";
import expenseCategoriesRoutes from "./routes/expenseCategories.js";
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
app.use("/api/expense-categories", expenseCategoriesRoutes);
app.use("/api/rates", ratesRoutes);
app.use("/api/credits", creditsRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/employees", employeesRoutes);
app.use("/api/audit-logs", auditLogsRoutes);

// TD-019: unknown /api paths must answer JSON, never the SPA shell.
app.use("/api", (_req: Request, res: Response) => {
	res.status(404).json({ error: "Not found" });
});

// TD-019: serve the built client with SPA fallback when dist exists
// (production unified deployment; inert in dev/test).
registerClientStatic(app, path.resolve(process.cwd(), "packages/client/dist"));

// Global Express error handler — must be registered after all routes
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
	logger.error({ err }, "[Express Error]");
	res.status(500).json({ error: "Internal server error" });
});

export default app;
