import { requireAuth } from "@/lib/auth/clerk";
import { db } from "@/lib/db";
import { agents, actionRequests } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { getOrCreateWallet } from "@/lib/wallet/ledger";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCents } from "@/lib/utils";
import Link from "next/link";

export default async function DashboardPage() {
  const user = await requireAuth();
  const wallet = await getOrCreateWallet(user.id);

  const userAgents = await db.query.agents.findMany({
    where: and(eq(agents.ownerId, user.id)),
  });

  const activeAgents = userAgents.filter((a) => a.status === "active");

  const recentActions = await db.query.actionRequests.findMany({
    where: eq(
      actionRequests.agentId,
      userAgents[0]?.id ?? "00000000-0000-0000-0000-000000000000"
    ),
    orderBy: [desc(actionRequests.createdAt)],
    limit: 5,
  });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Wallet Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{formatCents(wallet.balance)}</p>
            <Link
              href="/wallet"
              className="text-sm text-[var(--muted-foreground)] hover:underline mt-1 inline-block"
            >
              View wallet
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Active Agents</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{activeAgents.length}</p>
            <Link
              href="/agents"
              className="text-sm text-[var(--muted-foreground)] hover:underline mt-1 inline-block"
            >
              Manage agents
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Total Agents</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{userAgents.length}</p>
            <Link
              href="/agents/new"
              className="text-sm text-[var(--muted-foreground)] hover:underline mt-1 inline-block"
            >
              Create agent
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {recentActions.length === 0 ? (
            <p className="text-sm text-[var(--muted-foreground)]">
              No recent activity. Create an agent and execute some actions to see
              activity here.
            </p>
          ) : (
            <div className="space-y-3">
              {recentActions.map((action) => (
                <div
                  key={action.id}
                  className="flex items-center justify-between rounded-md border border-[var(--border)] p-3"
                >
                  <div>
                    <p className="text-sm font-medium">{action.actionType}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {new Date(action.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <Badge
                    variant={
                      action.status === "completed"
                        ? "success"
                        : action.status === "failed" ||
                            action.status === "denied"
                          ? "destructive"
                          : "warning"
                    }
                  >
                    {action.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
