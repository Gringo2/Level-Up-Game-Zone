import cors from "cors";
import dotenv from "dotenv";
import express from "express";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

import auditLogsRoutes from "./routes/auditLogs.js";
import creditsRoutes from "./routes/credits.js";
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
app.use("/api/audit-logs", auditLogsRoutes);

app.listen(PORT, () => {
	console.log(`🚀 Server listening on http://localhost:${PORT}`);
});
