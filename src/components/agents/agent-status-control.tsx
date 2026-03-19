"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export function AgentStatusControl({
  agentId,
  currentStatus,
}: {
  agentId: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function updateStatus(status: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/agents/${agentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to update status");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update agent status");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Agent Controls</CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
            {error}
          </div>
        )}
        <div className="flex gap-3 flex-wrap">
          {currentStatus === "active" && (
            <Button
              variant="outline"
              onClick={() => updateStatus("suspended")}
              disabled={loading}
            >
              {loading ? "Updating..." : "Suspend Agent"}
            </Button>
          )}
          {currentStatus === "suspended" && (
            <Button
              variant="default"
              onClick={() => updateStatus("active")}
              disabled={loading}
            >
              {loading ? "Updating..." : "Reactivate Agent"}
            </Button>
          )}
          {currentStatus !== "archived" && (
            <Button
              variant="destructive"
              onClick={() => {
                if (confirm("Archive this agent? This cannot be undone.")) {
                  updateStatus("archived");
                }
              }}
              disabled={loading}
            >
              Archive Agent
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
