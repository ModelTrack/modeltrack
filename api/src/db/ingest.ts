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

function ingestNewEvents(): number {
  const filePath = getDataFilePath();

  if (!fs.existsSync(filePath)) {
    return 0;
  }

  const stat = fs.statSync(filePath);
  if (stat.size <= fileOffset) {
    return 0;
  }

  const fd = fs.openSync(filePath, "r");
  const buf = Buffer.alloc(stat.size - fileOffset);
  fs.readSync(fd, buf, 0, buf.length, fileOffset);
  fs.closeSync(fd);

  const buffer = buf.toString("utf-8");
  const lines = buffer.split("\n").filter((line) => line.trim().length > 0);
  const db = getDatabase();

  const insertStmt = db.prepare(
    `INSERT OR IGNORE INTO cost_events
    (event_id, timestamp, provider, model, input_tokens, output_tokens,
     cache_read_tokens, cache_write_tokens, cost_usd, latency_ms,
     status_code, is_streaming, app_id, team, feature, customer_tier,
     session_id, trace_id, prompt_hash, system_prompt_tokens,
     user_prompt_tokens, prompt_template_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  let ingested = 0;

  const insertMany = db.transaction((lines: string[]) => {
    for (const line of lines) {
      try {
        const event: CostEvent = JSON.parse(line);

        insertStmt.run(
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
          event.is_streaming ? 1 : 0,
          event.app_id || "",
          event.team || "",
          event.feature || "",
          event.customer_tier || "",
          event.session_id || "",
          event.trace_id || "",
          event.prompt_hash || "",
          event.system_prompt_tokens || 0,
          event.user_prompt_tokens || 0,
          event.prompt_template_id || ""
        );
        ingested++;
      } catch (err) {
        console.error(`Failed to parse/insert line: ${line}`, err);
      }
    }
  });

  insertMany(lines);

  fileOffset = stat.size;

  if (ingested > 0) {
    console.log(`Ingested ${ingested} new cost events.`);
  }

  return ingested;
}

export function startIngestion(intervalMs: number = 10000): void {
  console.log(
    `Starting ingestion loop (every ${intervalMs / 1000}s) from: ${getDataFilePath()}`
  );

  // Run immediately on start
  try {
    ingestNewEvents();
  } catch (err) {
    console.error("Initial ingestion failed:", err);
  }

  ingestionInterval = setInterval(() => {
    try {
      ingestNewEvents();
    } catch (err) {
      console.error("Ingestion cycle failed:", err);
    }
  }, intervalMs);
}

export function stopIngestion(): void {
  if (ingestionInterval) {
    clearInterval(ingestionInterval);
    ingestionInterval = null;
    console.log("Ingestion loop stopped.");
  }
}
