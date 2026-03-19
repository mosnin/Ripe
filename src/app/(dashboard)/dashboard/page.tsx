import { requireAuth } from "@/lib/auth/clerk";
import { db } from "@/lib/db";
import { agents, actionRequests, walletTransactions, agentPermissions } from "@/lib/db/schema";
import { eq, desc, inArray, and, gte, sql } from "drizzle-orm";
import { getOrCreateWallet } from "@/lib/wallet/ledger";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCents } from "@/lib/utils";
import Link from "next/link";

const LOW_BALANCE_THRESHOLD = 1000; // $10

export default async function DashboardPage() {
  const user = await requireAuth();
  const wallet = await getOrCreateWallet(user.id);

  const userAgents = await db.query.agents.findMany({
    where: eq(agents.ownerId, user.id),
  });

  const activeAgents = userAgents.filter((a) => a.status === "active");
  const agentIds = userAgents.map((a) => a.id);
  const agentNameMap = new Map(userAgents.map((a) => [a.id, a.name]));

  // Fetch recent actions across ALL user's agents
  const recentActions = agentIds.length > 0
    ? await db.query.actionRequests.findMany({
        where: inArray(actionRequests.agentId, agentIds),
        orderBy: [desc(actionRequests.createdAt)],
        limit: 10,
      })
    : [];

  // Monthly spend: sum of debits in current calendar month
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const monthlySpendResult = await db
    .select({
      total: sql<number>`COALESCE(SUM(${walletTransactions.amount}), 0)`,
    })
    .from(walletTransactions)
    .where(
      and(
        eq(walletTransactions.walletId, wallet.id),
        eq(walletTransactions.type, "debit"),
        eq(walletTransactions.status, "completed"),
        gte(walletTransactions.createdAt, startOfMonth)
      )
    );
  const monthlySpend = Number(monthlySpendResult[0]?.total ?? 0);

  // Action stats: count by status (last 30 days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const actionStatusCounts = agentIds.length > 0
    ? await db
        .select({
          status: actionRequests.status,
          count: sql<number>`COUNT(*)`,
        })
        .from(actionRequests)
        .where(
          and(
            inArray(actionRequests.agentId, agentIds),
            gte(actionRequests.createdAt, thirtyDaysAgo)
          )
        )
        .groupBy(actionRequests.status)
    : [];

  const statusCounts = Object.fromEntries(
    actionStatusCounts.map((r) => [r.status, Number(r.count)])
  );
  const completedCount = statusCounts["completed"] ?? 0;
  const failedCount = (statusCounts["failed"] ?? 0) + (statusCounts["denied"] ?? 0);
  const totalActions = actionStatusCounts.reduce((acc, r) => acc + Number(r.count), 0);

  // Agents missing setup (no permissions)
  const agentsWithPerms = agentIds.length > 0
    ? await db
        .selectDistinct({ agentId: agentPermissions.agentId })
        .from(agentPermissions)
        .where(inArray(agentPermissions.agentId, agentIds))
    : [];
  const agentsWithPermsSet = new Set(agentsWithPerms.map((r) => r.agentId));
  const agentsNeedingSetup = activeAgents.filter((a) => !agentsWithPermsSet.has(a.id));

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      {/* Warnings */}
      {wallet.balance < LOW_BALANCE_THRESHOLD && (
        <div className="mb-4 rounded-md border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-200 flex items-center justify-between">
          <span>
            Low balance: {formatCents(wallet.balance)} remaining.
            Agent actions may fail if insufficient funds.
          </span>
          <Link
            href="/wallet"
            className="font-medium underline ml-2 whitespace-nowrap"
          >
            Add funds
          </Link>
        </div>
      )}

      {agentsNeedingSetup.length > 0 && (
        <div className="mb-4 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200">
          {agentsNeedingSetup.length === 1
            ? `Agent "${agentsNeedingSetup[0].name}" has no permissions — it cannot execute actions yet.`
            : `${agentsNeedingSetup.length} agents have no permissions and cannot execute actions.`}
          {" "}
          <Link
            href={`/agents/${agentsNeedingSetup[0].id}/permissions`}
            className="font-medium underline"
          >
            Set up permissions
          </Link>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCents(wallet.balance)}</p>
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
            <CardTitle>This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCents(monthlySpend)}</p>
            <p className="text-xs text-[var(--muted-foreground)] mt-1">spent</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Actions (30d)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalActions}</p>
            <p className="text-xs text-[var(--muted-foreground)] mt-1">
              <span className="text-green-600 dark:text-green-400">{completedCount} ok</span>
              {failedCount > 0 && (
                <span className="text-red-600 dark:text-red-400"> · {failedCount} failed</span>
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Agents</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {activeAgents.length}
              <span className="text-sm font-normal text-[var(--muted-foreground)]">
                {" "}/ {userAgents.length}
              </span>
            </p>
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
          <div className="flex items-center justify-between">
            <CardTitle>Recent Activity</CardTitle>
            <Link href="/activity">
              <span className="text-sm text-[var(--muted-foreground)] hover:underline">
                View all
              </span>
            </Link>
          </div>
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
                      {agentNameMap.get(action.agentId) ?? "Unknown agent"} &middot;{" "}
                      {new Date(action.createdAt).toLocaleString()}
                      {action.costCents != null && action.costCents > 0 && (
                        <> &middot; {formatCents(action.costCents)}</>
                      )}
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
