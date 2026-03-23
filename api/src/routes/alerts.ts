import { Router, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { getDatabase } from "../db/init";
import { sendTestMessage } from "../services/slack";

const router = Router();

// Detect anomalies and persist new ones to the alerts table.
// Deduplicates by team+hour so we don't create duplicates on each poll.
export function detectAndPersistAnomalies(): void {
  try {
    const db = getDatabase();

    const rows = db.prepare(`
      WITH hourly AS (
        SELECT
          strftime('%Y-%m-%dT%H:00:00Z', timestamp) AS hour,
          team,
          SUM(cost_usd) AS hourly_spend
        FROM cost_events
        GROUP BY strftime('%Y-%m-%dT%H:00:00Z', timestamp), team
      ),
      avg_hourly AS (
        SELECT
          team,
          AVG(hourly_spend) AS avg_spend
        FROM hourly
        GROUP BY team
      )
      SELECT
        h.hour,
        h.team,
        h.hourly_spend,
        a.avg_spend
      FROM hourly h
      JOIN avg_hourly a ON h.team = a.team
      WHERE h.hourly_spend > 2 * a.avg_spend
        AND a.avg_spend > 0
      ORDER BY h.hour DESC
      LIMIT 200
    `).all() as Array<{
      hour: string;
      team: string;
      hourly_spend: number;
      avg_spend: number;
    }>;

    const insertStmt = db.prepare(`
      INSERT OR IGNORE INTO alerts (id, type, team, hour, message, hourly_spend, avg_spend)
      VALUES (?, 'anomaly', ?, ?, ?, ?, ?)
    `);

    const insertMany = db.transaction((anomalies: typeof rows) => {
      for (const r of anomalies) {
        const msg = `Team "${r.team}" spent $${r.hourly_spend.toFixed(4)} in hour ${r.hour}, which is ${(r.hourly_spend / r.avg_spend).toFixed(1)}x the average ($${r.avg_spend.toFixed(4)})`;
        insertStmt.run(uuidv4(), r.team, r.hour, msg, r.hourly_spend, r.avg_spend);
      }
    });

    insertMany(rows);
  } catch (err) {
    console.error("Error detecting anomalies:", err);
  }
}

// GET /api/alerts — list alerts (excludes dismissed by default)
router.get("/", (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const includeDismissed = req.query.include_dismissed === "true";

    let query = `
      SELECT id, type, team, hour, message, hourly_spend, avg_spend, dismissed_at, created_at
      FROM alerts
    `;
    if (!includeDismissed) {
      query += ` WHERE dismissed_at IS NULL`;
    }
    query += ` ORDER BY created_at DESC LIMIT 200`;

    const rows = db.prepare(query).all();
    res.json({ data: rows, error: null });
  } catch (err: any) {
    console.error("Error in GET /api/alerts:", err);
    res.status(500).json({ data: null, error: err.message });
  }
});

// PATCH /api/alerts/:id/dismiss — dismiss a single alert
router.patch("/:id/dismiss", (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const result = db.prepare(
      `UPDATE alerts SET dismissed_at = datetime('now') WHERE id = ? AND dismissed_at IS NULL`
    ).run(req.params.id);

    if (result.changes === 0) {
      res.status(404).json({ data: null, error: "Alert not found or already dismissed." });
      return;
    }
    res.json({ data: { dismissed: true, id: req.params.id }, error: null });
  } catch (err: any) {
    res.status(500).json({ data: null, error: err.message });
  }
});

// PATCH /api/alerts/dismiss-bulk — dismiss multiple alerts
router.patch("/dismiss-bulk", (req: Request, res: Response) => {
  try {
    const { ids } = req.body as { ids: string[] };
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ data: null, error: "ids array required" });
      return;
    }

    const db = getDatabase();
    const placeholders = ids.map(() => "?").join(",");
    const result = db.prepare(
      `UPDATE alerts SET dismissed_at = datetime('now') WHERE id IN (${placeholders}) AND dismissed_at IS NULL`
    ).run(...ids);

    res.json({ data: { dismissed: result.changes }, error: null });
  } catch (err: any) {
    res.status(500).json({ data: null, error: err.message });
  }
});

// PATCH /api/alerts/restore-all — restore all dismissed alerts
router.patch("/restore-all", (_req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const result = db.prepare(`UPDATE alerts SET dismissed_at = NULL WHERE dismissed_at IS NOT NULL`).run();
    res.json({ data: { restored: result.changes }, error: null });
  } catch (err: any) {
    res.status(500).json({ data: null, error: err.message });
  }
});

// POST /api/alerts/budgets — set a budget for a team/app
router.post("/budgets", (req: Request, res: Response) => {
  try {
    const { team, app_id, daily_limit_usd, monthly_limit_usd } = req.body;

    if (!daily_limit_usd && !monthly_limit_usd) {
      res.status(400).json({
        data: null,
        error: "At least one of daily_limit_usd or monthly_limit_usd is required.",
      });
      return;
    }

    const db = getDatabase();
    const id = uuidv4();

    db.prepare(
      `INSERT INTO budgets (id, team, app_id, daily_limit_usd, monthly_limit_usd)
       VALUES (?, ?, ?, ?, ?)`
    ).run(id, team || "", app_id || "", daily_limit_usd || 0, monthly_limit_usd || 0);

    const budget = {
      id,
      team: team || "",
      app_id: app_id || "",
      daily_limit_usd: daily_limit_usd || 0,
      monthly_limit_usd: monthly_limit_usd || 0,
      created_at: new Date().toISOString(),
    };

    res.status(201).json({ data: budget, error: null });
  } catch (err: any) {
    res.status(500).json({ data: null, error: err.message });
  }
});

// GET /api/alerts/budgets
router.get("/budgets", (_req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const rows = db.prepare(`SELECT * FROM budgets ORDER BY created_at DESC`).all();
    res.json({ data: rows, error: null });
  } catch (err: any) {
    res.status(500).json({ data: null, error: err.message });
  }
});

// DELETE /api/alerts/budgets/:id
router.delete("/budgets/:id", (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const result = db.prepare(`DELETE FROM budgets WHERE id = ?`).run(req.params.id);
    if (result.changes === 0) {
      res.status(404).json({ data: null, error: `Budget not found.` });
      return;
    }
    res.json({ data: { deleted: true, id: req.params.id }, error: null });
  } catch (err: any) {
    res.status(500).json({ data: null, error: err.message });
  }
});

// POST /api/alerts/test-slack
router.post("/test-slack", async (_req: Request, res: Response) => {
  try {
    if (!process.env.SLACK_WEBHOOK_URL) {
      res.status(400).json({ data: null, error: "SLACK_WEBHOOK_URL is not configured." });
      return;
    }
    const success = await sendTestMessage();
    if (success) {
      res.json({ data: { message: "Test message sent." }, error: null });
    } else {
      res.status(502).json({ data: null, error: "Failed to send to Slack." });
    }
  } catch (err: any) {
    res.status(500).json({ data: null, error: err.message });
  }
});

export default router;
