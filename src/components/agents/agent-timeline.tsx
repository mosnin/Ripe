import { db } from "@/lib/db";
import { auditLogs, actionRequests } from "@/lib/db/schema";
import { eq, desc, or } from "drizzle-orm";
import { formatCents } from "@/lib/utils";

interface TimelineEvent {
  id: string;
  action: string;
  detail: string;
  timestamp: Date;
  variant: "default" | "success" | "error" | "warning";
}

function actionLabel(action: string): { label: string; variant: TimelineEvent["variant"] } {
  switch (action) {
    case "agent.created":
      return { label: "Agent created", variant: "success" };
    case "agent.updated":
      return { label: "Agent updated", variant: "default" };
    case "agent.suspended":
      return { label: "Agent suspended", variant: "warning" };
    case "agent.reactivated":
      return { label: "Agent reactivated", variant: "success" };
    case "agent.archived":
      return { label: "Agent archived", variant: "error" };
    case "api_key.created":
      return { label: "API key generated", variant: "success" };
    case "api_key.revoked":
      return { label: "API key revoked", variant: "warning" };
    case "permission.granted":
      return { label: "Permission granted", variant: "success" };
    case "permission.revoked":
      return { label: "Permission revoked", variant: "warning" };
    case "policy.updated":
      return { label: "Spending policy updated", variant: "default" };
    case "action.completed":
      return { label: "Action executed", variant: "success" };
    case "action.denied":
      return { label: "Action denied", variant: "error" };
    case "action.failed":
      return { label: "Action failed", variant: "error" };
    default:
      return { label: action, variant: "default" };
  }
}

const variantColors = {
  default: "bg-[var(--muted-foreground)]",
  success: "bg-green-500",
  error: "bg-red-500",
  warning: "bg-yellow-500",
};

export async function AgentTimeline({ agentId }: { agentId: string }) {
  // Fetch audit logs for this agent
  const logs = await db.query.auditLogs.findMany({
    where: or(
      eq(auditLogs.actorId, agentId),
      eq(auditLogs.resourceId, agentId)
    ),
    orderBy: [desc(auditLogs.createdAt)],
    limit: 15,
  });

  // Fetch recent action requests for extra context
  const recentActions = await db.query.actionRequests.findMany({
    where: eq(actionRequests.agentId, agentId),
    orderBy: [desc(actionRequests.createdAt)],
    limit: 5,
  });

  // Merge into timeline events
  const events: TimelineEvent[] = [];

  for (const log of logs) {
    const { label, variant } = actionLabel(log.action);
    const meta = log.metadata as Record<string, unknown> | null;
    let detail = "";

    if (meta?.permission) detail = String(meta.permission);
    if (meta?.action) detail = String(meta.action);
    if (meta?.reason) detail = String(meta.reason);
    if (meta?.source === "test_panel") detail += " (test)";

    events.push({
      id: log.id,
      action: label,
      detail,
      timestamp: log.createdAt,
      variant,
    });
  }

  // Add completed actions with cost info if not already in audit logs
  const auditActionIds = new Set(
    logs
      .filter((l) => l.resourceType === "action_request")
      .map((l) => l.resourceId)
  );

  for (const action of recentActions) {
    if (auditActionIds.has(action.id)) continue;
    const isSuccess = action.status === "completed";
    const isFailed = action.status === "failed" || action.status === "denied";
    events.push({
      id: action.id,
      action: `${action.actionType} ${isSuccess ? "completed" : isFailed ? action.status : action.status}`,
      detail: action.costCents && action.costCents > 0 ? formatCents(action.costCents) : "",
      timestamp: action.completedAt ?? action.createdAt,
      variant: isSuccess ? "success" : isFailed ? "error" : "default",
    });
  }

  // Sort by timestamp descending
  events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // Deduplicate by ID and limit
  const seen = new Set<string>();
  const uniqueEvents = events.filter((e) => {
    if (seen.has(e.id)) return false;
    seen.add(e.id);
    return true;
  }).slice(0, 10);

  if (uniqueEvents.length === 0) {
    return null;
  }

  return (
    <div className="space-y-0">
      {uniqueEvents.map((event, i) => (
        <div key={event.id} className="flex gap-3">
          {/* Timeline dot + line */}
          <div className="flex flex-col items-center">
            <div className={`mt-1.5 h-2.5 w-2.5 rounded-full shrink-0 ${variantColors[event.variant]}`} />
            {i < uniqueEvents.length - 1 && (
              <div className="w-px flex-1 bg-[var(--border)]" />
            )}
          </div>
          {/* Content */}
          <div className="pb-4 min-w-0">
            <p className="text-sm font-medium leading-tight">{event.action}</p>
            {event.detail && (
              <p className="text-xs text-[var(--muted-foreground)] mt-0.5 truncate">
                {event.detail}
              </p>
            )}
            <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
              {new Date(event.timestamp).toLocaleString()}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
