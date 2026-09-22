import path from "node:path";
import cors from "cors";
import dotenv from "dotenv";
import express, {
	type NextFunction,
	type Request,
	type RequestHandler,
	type Response,
} from "express";
import helmet from "helmet";
import { registerClientStatic } from "./staticHosting.js";

dotenv.config();

import { ROLES } from "@level-up/shared";
import { requireAuth, requireRole } from "./middleware/auth.js";
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

// Trust reverse proxy (LiteSpeed, Cloudflare, Passenger) for rate limiting & IP resolution
app.set("trust proxy", 1);

app.use(
	helmet({
		crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
		contentSecurityPolicy: {
			directives: {
				defaultSrc: ["'self'"],
				scriptSrc: ["'self'", "https://apis.google.com"],
				frameSrc: ["'self'", "https://*.firebaseapp.com"],
				connectSrc: [
					"'self'",
					"https://*.googleapis.com",
					"https://*.firebaseio.com",
					"https://identitytoolkit.googleapis.com",
					"https://securetoken.googleapis.com",
				],
				imgSrc: ["'self'", "data:", "https://*.googleusercontent.com"],
				styleSrc: ["'self'", "https:", "'unsafe-inline'"],
				fontSrc: ["'self'", "https:", "data:"],
			},
		},
	}),
);
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

// Only managers and admins (owners) operate the shop system; staff-role
// accounts get no access to operational data. /api/users stays outside this
// gate so sign-in (GET /me) and invite registration (POST /) keep working;
// its other routes are admin-only already.
const operators = [
	requireAuth as RequestHandler,
	requireRole([ROLES.MANAGER, ROLES.ADMIN]) as RequestHandler,
];

app.use("/api/shifts", operators, shiftRoutes);
app.use("/api/sales", operators, salesRoutes);
app.use("/api/keno", operators, kenoRoutes);
app.use("/api/expenses", operators, expensesRoutes);
app.use("/api/expense-categories", operators, expenseCategoriesRoutes);
app.use("/api/rates", operators, ratesRoutes);
app.use("/api/credits", operators, creditsRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/employees", operators, employeesRoutes);
app.use("/api/audit-logs", operators, auditLogsRoutes);

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
