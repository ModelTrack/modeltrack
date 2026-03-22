import Database from "better-sqlite3";
import path from "path";

let db: Database.Database | null = null;

export function initDatabase(): Database.Database {
  const dbPath = process.env.DB_PATH || "../data/costtrack.db";
  const resolvedPath = path.resolve(__dirname, "../../", dbPath);

  console.log(`Initializing SQLite at: ${resolvedPath}`);
  db = new Database(resolvedPath);

  db.pragma("journal_mode = WAL");

  db.exec(`
    CREATE TABLE IF NOT EXISTS cost_events (
      event_id TEXT PRIMARY KEY,
      timestamp TEXT NOT NULL,
      provider TEXT NOT NULL,
      model TEXT NOT NULL,
      input_tokens INTEGER DEFAULT 0,
      output_tokens INTEGER DEFAULT 0,
      cache_read_tokens INTEGER DEFAULT 0,
      cache_write_tokens INTEGER DEFAULT 0,
      cost_usd REAL NOT NULL,
      latency_ms INTEGER DEFAULT 0,
      status_code INTEGER DEFAULT 200,
      is_streaming INTEGER DEFAULT 0,
      app_id TEXT DEFAULT '',
      team TEXT DEFAULT '',
      feature TEXT DEFAULT '',
      customer_tier TEXT DEFAULT '',
      session_id TEXT DEFAULT '',
      trace_id TEXT DEFAULT '',
      prompt_hash TEXT DEFAULT '',
      system_prompt_tokens INTEGER DEFAULT 0,
      user_prompt_tokens INTEGER DEFAULT 0,
      prompt_template_id TEXT DEFAULT ''
    )
  `);

  db.exec(`
    CREATE VIEW IF NOT EXISTS daily_spend AS
    SELECT
      strftime('%Y-%m-%d', timestamp) AS day,
      team,
      app_id,
      model,
      SUM(cost_usd) AS total_spend,
      COUNT(*) AS request_count,
      SUM(input_tokens) AS total_input_tokens,
      SUM(output_tokens) AS total_output_tokens
    FROM cost_events
    GROUP BY strftime('%Y-%m-%d', timestamp), team, app_id, model
  `);

  db.exec(`
    CREATE VIEW IF NOT EXISTS model_usage AS
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

  db.exec(`
    CREATE VIEW IF NOT EXISTS team_spend AS
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

  db.exec(`
    CREATE VIEW IF NOT EXISTS session_costs AS
    SELECT
      session_id,
      SUM(cost_usd) AS total_cost,
      COUNT(*) AS request_count,
      GROUP_CONCAT(DISTINCT model) AS models,
      (julianday(MAX(timestamp)) - julianday(MIN(timestamp))) * 86400 AS duration_seconds,
      team,
      app_id,
      MIN(timestamp) AS first_seen,
      MAX(timestamp) AS last_seen
    FROM cost_events
    WHERE session_id != ''
    GROUP BY session_id
  `);

  // Add prompt analysis columns to existing tables (safe to run multiple times).
  const colCheck = db.prepare(
    "SELECT COUNT(*) AS cnt FROM pragma_table_info('cost_events') WHERE name = 'prompt_hash'"
  ).get() as any;
  if (colCheck.cnt === 0) {
    db.exec(`ALTER TABLE cost_events ADD COLUMN prompt_hash TEXT DEFAULT ''`);
    db.exec(`ALTER TABLE cost_events ADD COLUMN system_prompt_tokens INTEGER DEFAULT 0`);
    db.exec(`ALTER TABLE cost_events ADD COLUMN user_prompt_tokens INTEGER DEFAULT 0`);
    db.exec(`ALTER TABLE cost_events ADD COLUMN prompt_template_id TEXT DEFAULT ''`);
  }

  db.exec(`
    CREATE VIEW IF NOT EXISTS prompt_analysis AS
    SELECT
      COALESCE(NULLIF(prompt_template_id, ''), prompt_hash) AS prompt_id,
      COUNT(*) AS request_count,
      SUM(cost_usd) AS total_cost,
      AVG(cost_usd) AS avg_cost,
      AVG(system_prompt_tokens) AS avg_system_tokens,
      AVG(user_prompt_tokens) AS avg_user_tokens,
      AVG(input_tokens) AS avg_total_input_tokens,
      AVG(output_tokens) AS avg_output_tokens,
      SUM(cost_usd) * 1.0 / COUNT(*) AS cost_per_request,
      GROUP_CONCAT(DISTINCT model) AS models_used,
      GROUP_CONCAT(DISTINCT feature) AS features,
      GROUP_CONCAT(DISTINCT team) AS teams
    FROM cost_events
    WHERE prompt_hash IS NOT NULL AND prompt_hash != ''
    GROUP BY prompt_id
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS budgets (
      id TEXT PRIMARY KEY,
      team TEXT DEFAULT '',
      app_id TEXT DEFAULT '',
      daily_limit_usd REAL DEFAULT 0,
      monthly_limit_usd REAL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  console.log("Database initialized with tables and views.");
  return db;
}

export function getDatabase(): Database.Database {
  if (!db) {
    throw new Error("Database not initialized. Call initDatabase() first.");
  }
  return db;
}
