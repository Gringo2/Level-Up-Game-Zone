import cors from "cors";
import dotenv from "dotenv";
import express from "express";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

import shiftRoutes from "./routes/shifts.js";

// Health check endpoint
app.get("/api/health", (_req, res) => {
	res.json({ status: "ok", message: "Server is running properly!" });
});

app.use("/api/shifts", shiftRoutes);

app.listen(PORT, () => {
	console.log(`🚀 Server listening on http://localhost:${PORT}`);
});
