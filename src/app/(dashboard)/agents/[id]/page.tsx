import { requireAuth } from "@/lib/auth/clerk";
import { db } from "@/lib/db";
import { agents } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import Link from "next/link";
import { AgentStatusControl } from "@/components/agents/agent-status-control";
import { AgentSetupWizard } from "@/components/agents/agent-setup-wizard";
import { AgentTimeline } from "@/components/agents/agent-timeline";
import { CopyButton } from "@/components/ui/copy-button";

export default async function AgentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireAuth();
  const { id } = await params;

  const agent = await db.query.agents.findFirst({
    where: and(eq(agents.id, id), eq(agents.ownerId, user.id)),
    with: {
      permissions: true,
      apiKeys: {
        columns: {
          id: true,
          keyPrefix: true,
          label: true,
          status: true,
          lastUsedAt: true,
          createdAt: true,
        },
      },
      spendingPolicy: true,
    },
  });

  if (!agent) notFound();

  const activeKeys = agent.apiKeys.filter((k) => k.status === "active");
  const statusVariant =
    agent.status === "active"
      ? ("success" as const)
      : agent.status === "suspended"
        ? ("warning" as const)
        : ("destructive" as const);

  return (
    <div>
      <Breadcrumb
        items={[
          { label: "Agents", href: "/agents" },
          { label: agent.name },
        ]}
      />
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{agent.name}</h1>
          {agent.description && (
            <p className="text-[var(--muted-foreground)] mt-1">
              {agent.description}
            </p>
          )}
        </div>
        <Badge variant={statusVariant}>{agent.status}</Badge>
      </div>

      {/* Setup wizard (hidden when all steps complete) */}
      <AgentSetupWizard
        agentId={id}
        hasKeys={activeKeys.length > 0}
        hasPermissions={agent.permissions.length > 0}
        hasPolicy={agent.spendingPolicy != null}
      />

      {/* Quick info */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>API Keys</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{activeKeys.length}</p>
            <Link href={`/agents/${id}/keys`}>
              <span className="text-sm text-[var(--muted-foreground)] hover:underline">
                Manage keys
              </span>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Permissions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{agent.permissions.length}</p>
            <Link href={`/agents/${id}/permissions`}>
              <span className="text-sm text-[var(--muted-foreground)] hover:underline">
                Manage permissions
              </span>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Spending Policy</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {agent.spendingPolicy ? "Configured" : "Default"}
            </p>
            <Link href={`/agents/${id}/policy`}>
              <span className="text-sm text-[var(--muted-foreground)] hover:underline">
                Configure policy
              </span>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Test</CardTitle>
          </CardHeader>
          <CardContent>
            <Link href={`/agents/${id}/test`}>
              <Button variant="outline" size="sm">
                Open Playground
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      <div className="mb-8 flex gap-4">
        <Link
          href={`/agents/${id}/logs`}
          className="text-sm text-[var(--muted-foreground)] hover:underline"
        >
          View action logs
        </Link>
        <Link
          href={`/agents/${id}/webhook`}
          className="text-sm text-[var(--muted-foreground)] hover:underline"
        >
          Configure webhook
        </Link>
      </div>

      {/* Recent timeline */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <AgentTimeline agentId={id} />
        </CardContent>
      </Card>

      {/* Agent ID */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Agent ID</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <code className="text-sm bg-[var(--muted)] px-2 py-1 rounded">
              {agent.id}
            </code>
            <CopyButton value={agent.id} />
          </div>
        </CardContent>
      </Card>

      {/* Status control */}
      <AgentStatusControl agentId={agent.id} currentStatus={agent.status} />
    </div>
  );
}
