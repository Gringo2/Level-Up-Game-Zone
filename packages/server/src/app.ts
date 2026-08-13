import cors from "cors";
import dotenv from "dotenv";
import express, {
	type NextFunction,
	type Request,
	type Response,
} from "express";

dotenv.config();

const app = express();

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

export default app;
