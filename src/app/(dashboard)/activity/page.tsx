"use client";

import { useState, useEffect, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface AuditLog {
  id: string;
  actorType: string;
  actorId: string;
  action: string;
  resourceType: string | null;
  resourceId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export default function ActivityPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [agentNames, setAgentNames] = useState<Record<string, string>>({});
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const limit = 50;

  const fetchLogs = useCallback(async (off: number) => {
    const res = await fetch(`/api/audit?limit=${limit}&offset=${off}`);
    const data = await res.json();
    const newLogs = data.logs ?? [];
    setAgentNames(data.agents ?? {});
    if (off === 0) {
      setLogs(newLogs);
    } else {
      setLogs((prev) => [...prev, ...newLogs]);
    }
    setHasMore(newLogs.length === limit);
  }, []);

  useEffect(() => {
    fetchLogs(0);
  }, [fetchLogs]);

  const actorLabel = (log: AuditLog) => {
    if (log.actorType === "agent") {
      return agentNames[log.actorId] ?? `Agent ${log.actorId.slice(0, 8)}`;
    }
    if (log.actorType === "user") return "You";
    return "System";
  };

  const actorVariant = (type: string) => {
    switch (type) {
      case "agent":
        return "outline" as const;
      case "user":
        return "default" as const;
      default:
        return "warning" as const;
    }
  };

  const actionColor = (action: string) => {
    if (action.includes("created") || action.includes("granted") || action.includes("funded"))
      return "text-green-600";
    if (action.includes("revoked") || action.includes("archived") || action.includes("denied"))
      return "text-red-600";
    if (action.includes("failed")) return "text-red-600";
    return "";
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Activity Log</h1>

      <Card>
        <CardHeader>
          <CardTitle>All Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="text-sm text-[var(--muted-foreground)]">
              No activity recorded yet.
            </p>
          ) : (
            <>
              <div className="space-y-2">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-start justify-between rounded-md border border-[var(--border)] p-3"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={actorVariant(log.actorType)}>
                          {actorLabel(log)}
                        </Badge>
                        <span className={`text-sm font-medium ${actionColor(log.action)}`}>
                          {log.action}
                        </span>
                      </div>
                      <div className="text-xs text-[var(--muted-foreground)]">
                        {log.resourceType && (
                          <span>
                            {log.resourceType}
                            {log.resourceId && `: ${log.resourceId.slice(0, 8)}...`}
                            {" · "}
                          </span>
                        )}
                        {new Date(log.createdAt).toLocaleString()}
                      </div>
                      {log.metadata && Object.keys(log.metadata).length > 0 && (
                        <details className="mt-1">
                          <summary className="text-xs text-[var(--muted-foreground)] cursor-pointer">
                            Details
                          </summary>
                          <pre className="text-xs mt-1 bg-[var(--muted)] p-2 rounded overflow-x-auto">
                            {JSON.stringify(log.metadata, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {hasMore && (
                <div className="mt-4 text-center">
                  <Button
                    variant="outline"
                    onClick={() => {
                      const newOffset = offset + limit;
                      setOffset(newOffset);
                      fetchLogs(newOffset);
                    }}
                  >
                    Load More
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
