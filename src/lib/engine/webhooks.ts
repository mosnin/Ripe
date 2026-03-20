import { db } from "@/lib/db";
import { agents } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

interface WebhookPayload {
  event: string;
  agent_id: string;
  action_request_id?: string;
  data: Record<string, unknown>;
  timestamp: string;
}

/**
 * Fire a webhook for an agent if configured.
 * Non-blocking — failures are logged but don't propagate.
 */
export async function fireWebhook(
  agentId: string,
  event: string,
  data: Record<string, unknown>,
  actionRequestId?: string
) {
  try {
    const agent = await db.query.agents.findFirst({
      where: eq(agents.id, agentId),
      columns: { webhookUrl: true },
    });

    if (!agent?.webhookUrl) return;

    const payload: WebhookPayload = {
      event,
      agent_id: agentId,
      action_request_id: actionRequestId,
      data,
      timestamp: new Date().toISOString(),
    };

    // Fire and forget with timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    await fetch(agent.webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Ripe-Event": event,
        "X-Ripe-Agent-Id": agentId,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeout);
  } catch {
    // Webhook failures are non-critical — don't propagate
    console.error(`Webhook delivery failed for agent ${agentId}, event ${event}`);
  }
}
