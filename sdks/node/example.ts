/**
 * Example: Using CostTrack with the Anthropic Node SDK.
 *
 * Before running:
 *   1. Start the CostTrack proxy:  cd proxy && go run .
 *   2. Set your API key:           export ANTHROPIC_API_KEY=sk-ant-...
 *   3. Set CostTrack metadata:     export COSTTRACK_TEAM=my-team
 *                                  export COSTTRACK_APP=my-app
 *
 * Then run:
 *   npx ts-node example.ts
 */

// This single import auto-patches the Anthropic SDK.
import { configure, withSession } from "./costtrack";

// Optional: configure programmatically instead of (or in addition to) env vars.
configure({
  team: "product",
  app: "chatbot",
  feature: "customer-support",
});

import Anthropic from "@anthropic-ai/sdk";

async function main() {
  // Create the client as usual -- no baseURL change needed.
  const client = new Anthropic();

  // Simple request -- automatically routed through CostTrack proxy.
  const response = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 256,
    messages: [{ role: "user", content: "What is CostTrack?" }],
  });

  console.log("Response:", response.content[0]);

  // Session tracking -- group related calls under one session ID.
  await withSession("user-query-456", async () => {
    const sessionResponse = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 256,
      messages: [{ role: "user", content: "Summarize the previous answer." }],
    });
    console.log("Session response:", sessionResponse.content[0]);
  });
}

main().catch(console.error);
