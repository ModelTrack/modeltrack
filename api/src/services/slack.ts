import { Alert } from "../models/types";

// Rate limiting: track last send time per alert type key
const rateLimitMap = new Map<string, number>();
const RATE_LIMIT_MS = 5 * 60 * 1000; // 5 minutes

function isRateLimited(key: string): boolean {
  const lastSent = rateLimitMap.get(key);
  if (lastSent && Date.now() - lastSent < RATE_LIMIT_MS) {
    return true;
  }
  rateLimitMap.set(key, Date.now());
  return false;
}

function getWebhookUrl(): string | null {
  return process.env.SLACK_WEBHOOK_URL || null;
}

async function postToSlack(payload: Record<string, unknown>): Promise<boolean> {
  const webhookUrl = getWebhookUrl();

  if (!webhookUrl) {
    console.log("[Slack] No SLACK_WEBHOOK_URL configured. Message (no-op):", JSON.stringify(payload, null, 2));
    return false;
  }

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error(`[Slack] Webhook request failed (${response.status}): ${text}`);
      return false;
    }

    console.log("[Slack] Message sent successfully.");
    return true;
  } catch (err) {
    console.error("[Slack] Failed to send message:", err);
    return false;
  }
}

export async function sendAlert(alert: Alert): Promise<boolean> {
  const rateLimitKey = `alert:${alert.team}:${alert.hour}`;
  if (isRateLimited(rateLimitKey)) {
    console.log(`[Slack] Rate limited: ${rateLimitKey}`);
    return false;
  }

  const multiplier = alert.avg_spend > 0
    ? (alert.hourly_spend / alert.avg_spend).toFixed(1)
    : "N/A";

  const payload = {
    attachments: [
      {
        color: "#e01e5a",
        blocks: [
          {
            type: "header",
            text: {
              type: "plain_text",
              text: "Spend Anomaly Detected",
              emoji: true,
            },
          },
          {
            type: "section",
            fields: [
              { type: "mrkdwn", text: `*Team:*\n${alert.team || "N/A"}` },
              { type: "mrkdwn", text: `*Hour:*\n${alert.hour}` },
              { type: "mrkdwn", text: `*Spend:*\n$${alert.hourly_spend.toFixed(4)}` },
              { type: "mrkdwn", text: `*Avg Spend:*\n$${alert.avg_spend.toFixed(4)}` },
              { type: "mrkdwn", text: `*Multiplier:*\n${multiplier}x the average` },
            ],
          },
          {
            type: "context",
            elements: [
              { type: "mrkdwn", text: `Alert ID: ${alert.id} | ${alert.created_at}` },
            ],
          },
        ],
      },
    ],
  };

  return postToSlack(payload);
}

export async function sendBudgetWarning(
  team: string,
  app: string,
  currentSpend: number,
  budgetLimit: number,
  percentage: number
): Promise<boolean> {
  const rateLimitKey = `budget:${team}:${app}`;
  if (isRateLimited(rateLimitKey)) {
    console.log(`[Slack] Rate limited: ${rateLimitKey}`);
    return false;
  }

  // Build a progress bar with emoji blocks
  const filledBlocks = Math.min(Math.round(percentage / 10), 10);
  const emptyBlocks = 10 - filledBlocks;
  const progressBar = "\u2588".repeat(filledBlocks) + "\u2591".repeat(emptyBlocks);

  const color = percentage >= 100 ? "#e01e5a" : percentage >= 80 ? "#ecb22e" : "#36a64f";

  const payload = {
    attachments: [
      {
        color,
        blocks: [
          {
            type: "header",
            text: {
              type: "plain_text",
              text: percentage >= 100 ? "Budget Exceeded!" : "Budget Warning",
              emoji: true,
            },
          },
          {
            type: "section",
            fields: [
              { type: "mrkdwn", text: `*Team:*\n${team || "All"}` },
              { type: "mrkdwn", text: `*App:*\n${app || "All"}` },
              { type: "mrkdwn", text: `*Current Spend:*\n$${currentSpend.toFixed(2)}` },
              { type: "mrkdwn", text: `*Budget Limit:*\n$${budgetLimit.toFixed(2)}` },
            ],
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*Usage:* ${progressBar} ${percentage.toFixed(1)}%`,
            },
          },
        ],
      },
    ],
  };

  return postToSlack(payload);
}

export interface DailySummary {
  totalSpend: number;
  requestCount: number;
  topModel: { model: string; spend: number } | null;
  topTeam: { team: string; spend: number } | null;
  spendYesterday: number;
}

export async function sendDailySummary(summary: DailySummary): Promise<boolean> {
  const rateLimitKey = "daily-summary";
  if (isRateLimited(rateLimitKey)) {
    console.log(`[Slack] Rate limited: ${rateLimitKey}`);
    return false;
  }

  const trend = summary.spendYesterday > 0
    ? summary.totalSpend > summary.spendYesterday ? "up" : "down"
    : "N/A";

  const trendEmoji = trend === "up" ? "^" : trend === "down" ? "v" : "-";
  const trendPct = summary.spendYesterday > 0
    ? Math.abs(((summary.totalSpend - summary.spendYesterday) / summary.spendYesterday) * 100).toFixed(1)
    : "0";

  const payload = {
    attachments: [
      {
        color: "#36a64f",
        blocks: [
          {
            type: "header",
            text: {
              type: "plain_text",
              text: "Daily Spend Summary",
              emoji: true,
            },
          },
          {
            type: "section",
            fields: [
              { type: "mrkdwn", text: `*Total Spend Today:*\n$${summary.totalSpend.toFixed(2)}` },
              { type: "mrkdwn", text: `*Requests:*\n${summary.requestCount.toLocaleString()}` },
              {
                type: "mrkdwn",
                text: `*Top Model:*\n${summary.topModel ? `${summary.topModel.model} ($${summary.topModel.spend.toFixed(2)})` : "N/A"}`,
              },
              {
                type: "mrkdwn",
                text: `*Top Team:*\n${summary.topTeam ? `${summary.topTeam.team} ($${summary.topTeam.spend.toFixed(2)})` : "N/A"}`,
              },
            ],
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*Trend vs Yesterday:* ${trendEmoji} ${trendPct}% (${trend})`,
            },
          },
          {
            type: "context",
            elements: [
              { type: "mrkdwn", text: `Generated at ${new Date().toISOString()}` },
            ],
          },
        ],
      },
    ],
  };

  return postToSlack(payload);
}

export interface WeeklySummary {
  totalSpend: number;
  requestCount: number;
  topModel: { model: string; spend: number } | null;
  topTeam: { team: string; spend: number } | null;
  spendChangePct: number;
  recommendations: string[];
}

export async function sendWeeklySummary(summary: WeeklySummary): Promise<boolean> {
  const rateLimitKey = "weekly-summary";
  if (isRateLimited(rateLimitKey)) {
    console.log(`[Slack] Rate limited: ${rateLimitKey}`);
    return false;
  }

  const trendEmoji = summary.spendChangePct > 0 ? "^" : summary.spendChangePct < 0 ? "v" : "-";
  const trendLabel = summary.spendChangePct > 0 ? "up" : summary.spendChangePct < 0 ? "down" : "flat";

  const recText = summary.recommendations.length > 0
    ? summary.recommendations.slice(0, 3).map((r) => `- ${r}`).join("\n")
    : "No recommendations this week.";

  const payload = {
    attachments: [
      {
        color: "#6366f1",
        blocks: [
          {
            type: "header",
            text: {
              type: "plain_text",
              text: "Weekly Spend Report",
              emoji: true,
            },
          },
          {
            type: "section",
            fields: [
              { type: "mrkdwn", text: `*Total Spend:*\n$${summary.totalSpend.toFixed(2)}` },
              { type: "mrkdwn", text: `*Requests:*\n${summary.requestCount.toLocaleString()}` },
              {
                type: "mrkdwn",
                text: `*Top Model:*\n${summary.topModel ? `${summary.topModel.model} ($${summary.topModel.spend.toFixed(2)})` : "N/A"}`,
              },
              {
                type: "mrkdwn",
                text: `*Top Team:*\n${summary.topTeam ? `${summary.topTeam.team} ($${summary.topTeam.spend.toFixed(2)})` : "N/A"}`,
              },
            ],
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*Trend vs Last Week:* ${trendEmoji} ${Math.abs(summary.spendChangePct).toFixed(1)}% (${trendLabel})`,
            },
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*Recommendations:*\n${recText}`,
            },
          },
          {
            type: "context",
            elements: [
              { type: "mrkdwn", text: `Generated at ${new Date().toISOString()}` },
            ],
          },
        ],
      },
    ],
  };

  return postToSlack(payload);
}

export async function sendTestMessage(): Promise<boolean> {
  const payload = {
    attachments: [
      {
        color: "#36a64f",
        blocks: [
          {
            type: "header",
            text: {
              type: "plain_text",
              text: "CostTrack Slack Integration Test",
              emoji: true,
            },
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: "Your Slack webhook is configured correctly! CostTrack will send spend alerts, budget warnings, and daily summaries to this channel.",
            },
          },
          {
            type: "context",
            elements: [
              { type: "mrkdwn", text: `Sent at ${new Date().toISOString()}` },
            ],
          },
        ],
      },
    ],
  };

  return postToSlack(payload);
}
