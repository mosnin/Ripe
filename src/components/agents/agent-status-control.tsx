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

  async function updateStatus(status: string) {
    setLoading(true);
    try {
      await fetch(`/api/agents/${agentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      router.refresh();
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
        <div className="flex gap-3">
          {currentStatus === "active" && (
            <Button
              variant="outline"
              onClick={() => updateStatus("suspended")}
              disabled={loading}
            >
              Suspend Agent
            </Button>
          )}
          {currentStatus === "suspended" && (
            <Button
              variant="default"
              onClick={() => updateStatus("active")}
              disabled={loading}
            >
              Reactivate Agent
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
