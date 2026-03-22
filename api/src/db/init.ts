import { Database } from "duckdb-async";
import path from "path";

let db: Database | null = null;

export async function initDatabase(): Promise<Database> {
  const dbPath = process.env.DB_PATH || "../data/costtrack.db";
  const resolvedPath = path.resolve(__dirname, "../../", dbPath);

  console.log(`Initializing DuckDB at: ${resolvedPath}`);
  db = await Database.create(resolvedPath);

  await db.run(`
    CREATE TABLE IF NOT EXISTS cost_events (
      event_id VARCHAR PRIMARY KEY,
      timestamp TIMESTAMP NOT NULL,
      provider VARCHAR NOT NULL,
      model VARCHAR NOT NULL,
      input_tokens INTEGER DEFAULT 0,
      output_tokens INTEGER DEFAULT 0,
      cache_read_tokens INTEGER DEFAULT 0,
      cache_write_tokens INTEGER DEFAULT 0,
      cost_usd DOUBLE NOT NULL,
      latency_ms INTEGER DEFAULT 0,
      status_code INTEGER DEFAULT 200,
      is_streaming BOOLEAN DEFAULT FALSE,
      app_id VARCHAR DEFAULT '',
      team VARCHAR DEFAULT '',
      feature VARCHAR DEFAULT '',
      customer_tier VARCHAR DEFAULT ''
    )
  `);

  await db.run(`
    CREATE OR REPLACE VIEW daily_spend AS
    SELECT
      DATE_TRUNC('day', timestamp) AS day,
      team,
      app_id,
      model,
      SUM(cost_usd) AS total_spend,
      COUNT(*) AS request_count,
      SUM(input_tokens) AS total_input_tokens,
      SUM(output_tokens) AS total_output_tokens
    FROM cost_events
    GROUP BY DATE_TRUNC('day', timestamp), team, app_id, model
  `);

  await db.run(`
    CREATE OR REPLACE VIEW model_usage AS
    SELECT
      model,
      provider,
      SUM(cost_usd) AS total_spend,
      SUM(input_tokens) AS total_input_tokens,
      SUM(output_tokens) AS total_output_tokens,
      SUM(input_tokens + output_tokens) AS total_tokens,
      AVG(cost_usd) AS avg_cost_per_request,
      COUNT(*) AS request_count
    FROM cost_events
    GROUP BY model, provider
  `);

  await db.run(`
    CREATE OR REPLACE VIEW team_spend AS
    SELECT
      team,
      SUM(cost_usd) AS total_spend,
      COUNT(*) AS request_count,
      model,
      app_id,
      SUM(cost_usd) AS segment_spend
    FROM cost_events
    GROUP BY team, model, app_id
  `);

  await db.run(`
    CREATE TABLE IF NOT EXISTS budgets (
      id VARCHAR PRIMARY KEY,
      team VARCHAR DEFAULT '',
      app_id VARCHAR DEFAULT '',
      daily_limit_usd DOUBLE DEFAULT 0,
      monthly_limit_usd DOUBLE DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  console.log("Database initialized with tables and views.");
  return db;
}

export function getDatabase(): Database {
  if (!db) {
    throw new Error("Database not initialized. Call initDatabase() first.");
  }
  return db;
}
