import { Router, Request, Response } from "express";
import { getDatabase } from "../db/init";

const router = Router();

// GET /api/sessions — list recent sessions with total cost, request count, duration.
router.get("/", (req: Request, res: Response) => {
  try {
    const { team, app_id, start_date, end_date, limit = "50" } = req.query;

    let query = `
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
    `;
    const params: any[] = [];

    if (team) {
      query += ` AND team = ?`;
      params.push(team);
    }
    if (app_id) {
      query += ` AND app_id = ?`;
      params.push(app_id);
    }
    if (start_date) {
      query += ` AND timestamp >= ?`;
      params.push(start_date);
    }
    if (end_date) {
      query += ` AND timestamp <= ?`;
      params.push(end_date);
    }

    query += ` GROUP BY session_id ORDER BY last_seen DESC LIMIT ?`;
    params.push(parseInt(limit as string, 10) || 50);

    const db = getDatabase();
    const rows = db.prepare(query).all(...params);

    res.json({ data: rows, error: null });
  } catch (err: any) {
    console.error("Error in GET /api/sessions:", err);
    res.status(500).json({ data: null, error: err.message });
  }
});

// GET /api/sessions/:id — get a single session's detail: all events and total cost.
router.get("/:id", (req: Request, res: Response) => {
  try {
    const sessionId = req.params.id;
    const db = getDatabase();

    const events = db
      .prepare(
        `SELECT * FROM cost_events WHERE session_id = ? ORDER BY timestamp ASC`
      )
      .all(sessionId);

    const summary = db
      .prepare(
        `SELECT
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
        WHERE session_id = ?
        GROUP BY session_id`
      )
      .get(sessionId);

    if (!summary) {
      res.status(404).json({ data: null, error: "Session not found" });
      return;
    }

    res.json({
      data: {
        summary,
        events,
      },
      error: null,
    });
  } catch (err: any) {
    console.error("Error in GET /api/sessions/:id:", err);
    res.status(500).json({ data: null, error: err.message });
  }
});

export default router;
