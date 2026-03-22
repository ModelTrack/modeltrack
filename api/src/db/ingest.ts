import fs from "fs";
import path from "path";
import { getDatabase } from "./init";
import { CostEvent } from "../models/types";

let fileOffset = 0;
let ingestionInterval: NodeJS.Timeout | null = null;

function getDataFilePath(): string {
  const dataDir = process.env.DATA_DIR || "../data";
  return path.resolve(__dirname, "../../", dataDir, "cost_events.jsonl");
}

async function ingestNewEvents(): Promise<number> {
  const filePath = getDataFilePath();

  if (!fs.existsSync(filePath)) {
    return 0;
  }

  const stat = fs.statSync(filePath);
  if (stat.size <= fileOffset) {
    return 0;
  }

  const stream = fs.createReadStream(filePath, {
    start: fileOffset,
    encoding: "utf-8",
  });

  let buffer = "";
  let ingested = 0;

  return new Promise((resolve, reject) => {
    stream.on("data", (chunk: string) => {
      buffer += chunk;
    });

    stream.on("end", async () => {
      const lines = buffer.split("\n").filter((line) => line.trim().length > 0);
      const db = getDatabase();

      for (const line of lines) {
        try {
          const event: CostEvent = JSON.parse(line);

          await db.run(
            `INSERT OR IGNORE INTO cost_events
            (event_id, timestamp, provider, model, input_tokens, output_tokens,
             cache_read_tokens, cache_write_tokens, cost_usd, latency_ms,
             status_code, is_streaming, app_id, team, feature, customer_tier)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            event.event_id,
            event.timestamp,
            event.provider,
            event.model,
            event.input_tokens || 0,
            event.output_tokens || 0,
            event.cache_read_tokens || 0,
            event.cache_write_tokens || 0,
            event.cost_usd,
            event.latency_ms || 0,
            event.status_code || 200,
            event.is_streaming || false,
            event.app_id || "",
            event.team || "",
            event.feature || "",
            event.customer_tier || ""
          );
          ingested++;
        } catch (err) {
          console.error(`Failed to parse/insert line: ${line}`, err);
        }
      }

      fileOffset = stat.size;

      if (ingested > 0) {
        console.log(`Ingested ${ingested} new cost events.`);
      }

      resolve(ingested);
    });

    stream.on("error", (err) => {
      console.error("Error reading JSONL file:", err);
      reject(err);
    });
  });
}

export function startIngestion(intervalMs: number = 10000): void {
  console.log(
    `Starting ingestion loop (every ${intervalMs / 1000}s) from: ${getDataFilePath()}`
  );

  // Run immediately on start
  ingestNewEvents().catch((err) =>
    console.error("Initial ingestion failed:", err)
  );

  ingestionInterval = setInterval(() => {
    ingestNewEvents().catch((err) =>
      console.error("Ingestion cycle failed:", err)
    );
  }, intervalMs);
}

export function stopIngestion(): void {
  if (ingestionInterval) {
    clearInterval(ingestionInterval);
    ingestionInterval = null;
    console.log("Ingestion loop stopped.");
  }
}
