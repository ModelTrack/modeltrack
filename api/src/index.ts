import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import { initDatabase } from "./db/init";
import { startIngestion } from "./db/ingest";
import spendRoutes from "./routes/spend";
import modelsRoutes from "./routes/models";
import teamsRoutes from "./routes/teams";
import alertsRoutes from "./routes/alerts";
import sessionsRoutes from "./routes/sessions";
import featuresRoutes from "./routes/features";
import promptsRoutes from "./routes/prompts";
import overviewRoutes from "./routes/overview";
import reportsRoutes from "./routes/reports";
import forecastRoutes from "./routes/forecast";
import estimatorRoutes from "./routes/estimator";
import segmentsRoutes from "./routes/segments";
import infrastructureRoutes from "./routes/infrastructure";
import { startScheduler } from "./services/scheduler";

const app = express();
const PORT = parseInt(process.env.PORT || "3001", 10);

// Middleware
app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:5174", "http://localhost:5175", "http://127.0.0.1:5173"],
    credentials: true,
  })
);
app.use(express.json());

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ data: { status: "ok", timestamp: new Date().toISOString() }, error: null });
});

// Routes
app.use("/api/spend", spendRoutes);
app.use("/api/models", modelsRoutes);
app.use("/api/teams", teamsRoutes);
app.use("/api/alerts", alertsRoutes);
app.use("/api/sessions", sessionsRoutes);
app.use("/api/features", featuresRoutes);
app.use("/api/prompts", promptsRoutes);
app.use("/api/overview", overviewRoutes);
app.use("/api/reports", reportsRoutes);
app.use("/api/forecast", forecastRoutes);
app.use("/api/estimator", estimatorRoutes);
app.use("/api/segments", segmentsRoutes);
app.use("/api/infrastructure", infrastructureRoutes);

// Start server
function main() {
  try {
    // Initialize SQLite
    initDatabase();
    console.log("SQLite initialized.");

    // Start JSONL ingestion loop (every 10 seconds)
    startIngestion(10_000);

    // Start Slack alert scheduler
    startScheduler();

    app.listen(PORT, () => {
      console.log(`CostTrack API server running on http://localhost:${PORT}`);
      console.log(`Dashboard CORS enabled for http://localhost:5173`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
}

main();
