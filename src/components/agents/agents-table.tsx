"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Agent {
  id: string;
  name: string;
  description: string | null;
  status: string;
  createdAt: string;
}

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

export function AgentsTable({ agents }: { agents: Agent[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allSelected = agents.length > 0 && selected.size === agents.length;

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(agents.map((a) => a.id)));
    }
  }

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelected(next);
  }

  async function batchAction(action: "suspend" | "reactivate" | "archive") {
    const ids = Array.from(selected);
    if (ids.length === 0) return;

    if (action === "archive") {
      if (!confirm(`Archive ${ids.length} agent(s)? This cannot be undone.`)) return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/agents/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agent_ids: ids, action }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Batch operation failed");
      }
      const data = await res.json();
      if (data.updated === 0) {
        setError(data.message ?? "No agents were updated");
      }
      setSelected(new Set());
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Batch operation failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {/* Batch actions bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 mb-3 rounded-md border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-950">
          <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
            {selected.size} selected
          </span>
          <div className="flex gap-2 ml-auto">
            <Button
              size="sm"
              variant="outline"
              onClick={() => batchAction("suspend")}
              disabled={loading}
            >
              Suspend
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => batchAction("reactivate")}
              disabled={loading}
            >
              Reactivate
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => batchAction("archive")}
              disabled={loading}
            >
              Archive
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelected(new Set())}
            >
              Clear
            </Button>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
          {error}
        </div>
      )}

      <div className="border border-[var(--border)] rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-[var(--muted)]">
            <tr>
              <th className="w-10 px-3 py-3">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  className="rounded"
                />
              </th>
              <th className="text-left px-4 py-3 font-medium">Name</th>
              <th className="text-left px-4 py-3 font-medium">Status</th>
              <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Created</th>
              <th className="text-right px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {agents.map((agent) => (
              <tr
                key={agent.id}
                className={`hover:bg-[var(--muted)] ${selected.has(agent.id) ? "bg-blue-50/50 dark:bg-blue-950/30" : ""}`}
              >
                <td className="px-3 py-3">
                  <input
                    type="checkbox"
                    checked={selected.has(agent.id)}
                    onChange={() => toggle(agent.id)}
                    className="rounded"
                  />
                </td>
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
    </div>
  );
}
