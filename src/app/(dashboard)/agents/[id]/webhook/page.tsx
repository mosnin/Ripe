"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { AgentBreadcrumb } from "@/components/agents/agent-breadcrumb";

export default function AgentWebhookPage() {
  const params = useParams();
  const agentId = params.id as string;
  const [agentName, setAgentName] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWebhook = useCallback(async () => {
    try {
      const [webhookRes, agentRes] = await Promise.all([
        fetch(`/api/agents/${agentId}/webhook`),
        fetch(`/api/agents/${agentId}`),
      ]);
      if (webhookRes.ok) {
        const data = await webhookRes.json();
        setWebhookUrl(data.webhook_url ?? "");
      }
      if (agentRes.ok) {
        const data = await agentRes.json();
        setAgentName(data.agent?.name ?? "Agent");
      }
    } catch {
      setError("Failed to load webhook settings");
    } finally {
      setPageLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    fetchWebhook();
  }, [fetchWebhook]);

  async function saveWebhook() {
    setLoading(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch(`/api/agents/${agentId}/webhook`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ webhook_url: webhookUrl || null }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to save");
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save webhook");
    } finally {
      setLoading(false);
    }
  }

  async function testWebhook() {
    if (!webhookUrl) return;
    setError(null);
    try {
      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "test",
          agent_id: agentId,
          data: { message: "Webhook test from Ripe" },
          timestamp: new Date().toISOString(),
        }),
        mode: "no-cors",
      });
      // no-cors won't give us the actual status, but it fires the request
      if (res.type === "opaque" || res.ok) {
        setSaved(false);
        setError(null);
        alert("Test webhook sent! Check your endpoint for the payload.");
      }
    } catch {
      setError("Failed to reach webhook URL. Check that the endpoint is accessible.");
    }
  }

  if (pageLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm text-[var(--muted-foreground)]">Loading...</p>
      </div>
    );
  }

  return (
    <div>
      <AgentBreadcrumb agentId={agentId} agentName={agentName} currentPage="Webhook" />
      <h1 className="text-2xl font-bold mb-6">Webhook Notifications</h1>

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
          {error}
        </div>
      )}

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Webhook URL</CardTitle>
          <CardDescription>
            When this agent executes an action (success or failure), Ripe will POST
            a JSON payload to this URL.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 max-w-lg">
            <Input
              type="url"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://your-server.com/webhooks/ripe"
            />
            <div className="flex gap-2">
              <Button onClick={saveWebhook} disabled={loading}>
                {loading ? "Saving..." : "Save"}
              </Button>
              {webhookUrl && (
                <Button variant="outline" onClick={testWebhook}>
                  Send Test
                </Button>
              )}
              {saved && (
                <span className="text-sm text-green-700 dark:text-green-400 self-center">
                  Saved!
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payload Format</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="text-xs bg-[var(--muted)] p-3 rounded overflow-x-auto">
{`{
  "event": "action.completed",
  "agent_id": "${agentId.slice(0, 8)}...",
  "action_request_id": "uuid",
  "data": {
    "action_type": "tools:echo",
    "result": { ... },
    "cost_cents": 0,
    "duration_ms": 42
  },
  "timestamp": "2025-01-01T00:00:00.000Z"
}`}
          </pre>
          <div className="mt-3 space-y-1">
            <p className="text-xs text-[var(--muted-foreground)]">
              <strong>Events:</strong> action.completed, action.failed, action.denied
            </p>
            <p className="text-xs text-[var(--muted-foreground)]">
              <strong>Headers:</strong> X-Ripe-Event, X-Ripe-Agent-Id, Content-Type: application/json
            </p>
            <p className="text-xs text-[var(--muted-foreground)]">
              <strong>Timeout:</strong> 5 seconds. Failures are logged but do not affect action execution.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
