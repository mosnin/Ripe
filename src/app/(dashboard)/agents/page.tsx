import { requireAuth } from "@/lib/auth/clerk";
import { db } from "@/lib/db";
import { agents } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default async function AgentsPage() {
  const user = await requireAuth();

  const userAgents = await db.query.agents.findMany({
    where: eq(agents.ownerId, user.id),
    orderBy: (a, { desc }) => [desc(a.createdAt)],
  });

  const statusVariant = (status: string) => {
    switch (status) {
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

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Agents</h1>
        <Link href="/agents/new">
          <Button>Create Agent</Button>
        </Link>
      </div>

      {userAgents.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-[var(--border)] rounded-lg">
          <p className="text-[var(--muted-foreground)] mb-4">
            No agents yet. Create your first agent to get started.
          </p>
          <Link href="/agents/new">
            <Button>Create Agent</Button>
          </Link>
        </div>
      ) : (
        <div className="border border-[var(--border)] rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[var(--muted)]">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Name</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-left px-4 py-3 font-medium">Created</th>
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
                      <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                        {agent.description}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={statusVariant(agent.status)}>
                      {agent.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-[var(--muted-foreground)]">
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
      )}
    </div>
  );
}
