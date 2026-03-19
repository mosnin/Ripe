"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AgentBreadcrumb } from "@/components/agents/agent-breadcrumb";
import { CopyButton } from "@/components/ui/copy-button";

interface ApiKey {
  id: string;
  keyPrefix: string;
  label: string;
  status: string;
  lastUsedAt: string | null;
  createdAt: string;
}

export default function AgentKeysPage() {
  const params = useParams();
  const agentId = params.id as string;
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [agentName, setAgentName] = useState<string>("");
  const [label, setLabel] = useState("default");
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchKeys = useCallback(async () => {
    try {
      const res = await fetch(`/api/agents/${agentId}`);
      if (!res.ok) throw new Error("Failed to load agent");
      const data = await res.json();
      setKeys(data.agent?.apiKeys ?? []);
      setAgentName(data.agent?.name ?? "Agent");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load keys");
    } finally {
      setPageLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  async function createKey() {
    setLoading(true);
    setNewKey(null);
    setError(null);
    try {
      const res = await fetch("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agent_id: agentId, label }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to generate key");
      }
      const data = await res.json();
      if (data.key?.raw_key) {
        setNewKey(data.key.raw_key);
      }
      await fetchKeys();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate key");
    } finally {
      setLoading(false);
    }
  }

  async function revokeKey(keyId: string) {
    if (!confirm("Revoke this API key? This cannot be undone.")) return;
    setError(null);
    try {
      const res = await fetch(`/api/keys?id=${keyId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to revoke key");
      await fetchKeys();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to revoke key");
    }
  }

  if (pageLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm text-[var(--muted-foreground)]">Loading keys...</p>
      </div>
    );
  }

  return (
    <div>
      <AgentBreadcrumb agentId={agentId} agentName={agentName} currentPage="API Keys" />
      <h1 className="text-2xl font-bold mb-6">API Keys</h1>

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
          {error}
        </div>
      )}

      {/* Create key */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Generate New Key</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">Label</label>
              <Input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Key label"
              />
            </div>
            <Button onClick={createKey} disabled={loading || !label}>
              {loading ? "Generating..." : "Generate Key"}
            </Button>
          </div>
          {newKey && (
            <div className="mt-4 p-4 rounded-md bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800">
              <p className="text-sm font-medium text-green-800 dark:text-green-200 mb-2">
                Copy this key now — it will not be shown again.
              </p>
              <div className="flex items-center gap-2">
                <code className="text-xs break-all bg-white dark:bg-black px-2 py-1 rounded block flex-1">
                  {newKey}
                </code>
                <CopyButton value={newKey} />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Key list */}
      <Card>
        <CardHeader>
          <CardTitle>Active Keys</CardTitle>
        </CardHeader>
        <CardContent>
          {keys.length === 0 ? (
            <p className="text-sm text-[var(--muted-foreground)]">
              No API keys. Generate one above.
            </p>
          ) : (
            <div className="space-y-3">
              {keys.map((key) => (
                <div
                  key={key.id}
                  className="flex items-center justify-between rounded-md border border-[var(--border)] p-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <code className="text-sm">ripe_ak_{key.keyPrefix}...</code>
                      <Badge
                        variant={
                          key.status === "active" ? "success" : "destructive"
                        }
                      >
                        {key.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-[var(--muted-foreground)] mt-1">
                      {key.label} — Created{" "}
                      {new Date(key.createdAt).toLocaleDateString()}
                      {key.lastUsedAt &&
                        ` — Last used ${new Date(key.lastUsedAt).toLocaleDateString()}`}
                    </p>
                  </div>
                  {key.status === "active" && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => revokeKey(key.id)}
                    >
                      Revoke
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
