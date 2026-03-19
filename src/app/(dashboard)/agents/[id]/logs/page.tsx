import { requireAuth } from "@/lib/auth/clerk";
import { db } from "@/lib/db";
import { agents, actionRequests } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { formatCents } from "@/lib/utils";

export default async function AgentLogsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireAuth();
  const { id } = await params;

  const agent = await db.query.agents.findFirst({
    where: and(eq(agents.id, id), eq(agents.ownerId, user.id)),
  });
  if (!agent) notFound();

  const logs = await db.query.actionRequests.findMany({
    where: eq(actionRequests.agentId, id),
    orderBy: (r, { desc }) => [desc(r.createdAt)],
    limit: 100,
  });

  const statusVariant = (status: string) => {
    switch (status) {
      case "completed":
        return "success" as const;
      case "failed":
      case "denied":
        return "destructive" as const;
      default:
        return "warning" as const;
    }
  };

  return (
    <div>
      <Breadcrumb
        items={[
          { label: "Agents", href: "/agents" },
          { label: agent.name, href: `/agents/${id}` },
          { label: "Logs" },
        ]}
      />
      <h1 className="text-2xl font-bold mb-6">
        Action Logs — {agent.name}
      </h1>

      <Card>
        <CardHeader>
          <CardTitle>Execution History</CardTitle>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="text-sm text-[var(--muted-foreground)]">
              No actions executed yet.
            </p>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="rounded-md border border-[var(--border)] p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">
                        {log.actionType}
                      </span>
                      <Badge variant={statusVariant(log.status)}>
                        {log.status}
                      </Badge>
                    </div>
                    <span className="text-xs text-[var(--muted-foreground)]">
                      {new Date(log.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-[var(--muted-foreground)]">
                    {log.costCents !== null && log.costCents > 0 && (
                      <span>Cost: {formatCents(log.costCents)}</span>
                    )}
                    {log.durationMs !== null && (
                      <span>Duration: {log.durationMs}ms</span>
                    )}
                  </div>
                  {log.error && (
                    <p className="text-xs text-[var(--destructive)] mt-2">
                      {log.error}
                    </p>
                  )}
                  {log.result != null && (
                    <details className="mt-2">
                      <summary className="text-xs text-[var(--muted-foreground)] cursor-pointer">
                        Result
                      </summary>
                      <pre className="text-xs mt-1 bg-[var(--muted)] p-2 rounded overflow-x-auto">
                        {JSON.stringify(log.result as Record<string, unknown>, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
