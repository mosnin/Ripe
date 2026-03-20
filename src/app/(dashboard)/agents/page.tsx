import { requireAuth } from "@/lib/auth/clerk";
import { db } from "@/lib/db";
import { agents } from "@/lib/db/schema";
import { eq, and, ilike, sql, SQL } from "drizzle-orm";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { AgentsFilters } from "@/components/agents/agents-filters";
import { AgentsTable } from "@/components/agents/agents-table";

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

  // Build pagination URLs
  function pageUrl(p: number) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (status && status !== "all") params.set("status", status);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return `/agents${qs ? `?${qs}` : ""}`;
  }

  // Serialize for client component
  const agentData = userAgents.map((a) => ({
    id: a.id,
    name: a.name,
    description: a.description,
    status: a.status,
    createdAt: a.createdAt.toISOString(),
  }));

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
          <AgentsTable agents={agentData} />

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
