import { requireAuth } from "@/lib/auth/clerk";
import { db } from "@/lib/db";
import { agents } from "@/lib/db/schema";
import { eq, and, ilike, sql, SQL } from "drizzle-orm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { AgentsFilters } from "@/components/agents/agents-filters";

const PAGE_SIZE = 10;

export default async function AgentsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; status?: string }>;
}) {
  const user = await requireAuth();
  const { page: pageStr, q, status } = await searchParams;
  const page = Math.max(1, parseInt(pageStr ?? "1", 10) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  // Build where conditions
  const conditions: SQL[] = [eq(agents.ownerId, user.id)];
  if (q) {
    conditions.push(ilike(agents.name, `%${q}%`));
  }
  if (status && status !== "all") {
    conditions.push(eq(agents.status, status as "active" | "suspended" | "archived"));
  }

  const whereClause = and(...conditions);

  // Parallel: count + page data
  const [countResult, userAgents] = await Promise.all([
    db
      .select({ count: sql<number>`COUNT(*)` })
      .from(agents)
      .where(whereClause),
    db.query.agents.findMany({
      where: whereClause,
      orderBy: (a, { desc }) => [desc(a.createdAt)],
      limit: PAGE_SIZE,
      offset,
    }),
  ]);

  const totalCount = Number(countResult[0]?.count ?? 0);
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const statusVariant = (s: string) => {
    switch (s) {
      case "active":
        return "success" as const;
      case "suspended":
        return "warning" as const;
      case "archived":
        return "destructive" as const;
      default:
        return "outline" as const;
    }
  };

  // Build pagination URLs
  function pageUrl(p: number) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (status && status !== "all") params.set("status", status);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return `/agents${qs ? `?${qs}` : ""}`;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Agents</h1>
        <Link href="/agents/new">
          <Button>Create Agent</Button>
        </Link>
      </div>

      {/* Search + filter */}
      <AgentsFilters currentQuery={q ?? ""} currentStatus={status ?? "all"} />

      {userAgents.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-[var(--border)] rounded-lg">
          <p className="text-[var(--muted-foreground)] mb-4">
            {q || (status && status !== "all")
              ? "No agents match your filters."
              : "No agents yet. Create your first agent to get started."}
          </p>
          {!q && (!status || status === "all") && (
            <Link href="/agents/new">
              <Button>Create Agent</Button>
            </Link>
          )}
        </div>
      ) : (
        <>
          <div className="border border-[var(--border)] rounded-lg overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--muted)]">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Name</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Created</th>
                  <th className="text-right px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {userAgents.map((agent) => (
                  <tr key={agent.id} className="hover:bg-[var(--muted)]">
                    <td className="px-4 py-3">
                      <Link
                        href={`/agents/${agent.id}`}
                        className="font-medium hover:underline"
                      >
                        {agent.name}
                      </Link>
                      {agent.description && (
                        <p className="text-xs text-[var(--muted-foreground)] mt-0.5 truncate max-w-xs">
                          {agent.description}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={statusVariant(agent.status)}>
                        {agent.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-[var(--muted-foreground)] hidden sm:table-cell">
                      {new Date(agent.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/agents/${agent.id}`}>
                        <Button variant="ghost" size="sm">
                          View
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-[var(--muted-foreground)]">
                Showing {offset + 1}–{Math.min(offset + PAGE_SIZE, totalCount)} of {totalCount}
              </p>
              <div className="flex gap-2">
                {page > 1 && (
                  <Link href={pageUrl(page - 1)}>
                    <Button variant="outline" size="sm">
                      Previous
                    </Button>
                  </Link>
                )}
                {page < totalPages && (
                  <Link href={pageUrl(page + 1)}>
                    <Button variant="outline" size="sm">
                      Next
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
