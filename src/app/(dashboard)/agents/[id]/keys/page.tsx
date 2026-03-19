"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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
  const [label, setLabel] = useState("default");
  const [loading, setLoading] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);

  const fetchKeys = useCallback(async () => {
    const res = await fetch(`/api/agents/${agentId}`);
    const data = await res.json();
    setKeys(data.agent?.apiKeys ?? []);
  }, [agentId]);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  async function createKey() {
    setLoading(true);
    setNewKey(null);
    try {
      const res = await fetch("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agent_id: agentId, label }),
      });
      const data = await res.json();
      if (data.key?.raw_key) {
        setNewKey(data.key.raw_key);
      }
      await fetchKeys();
    } finally {
      setLoading(false);
    }
  }

  async function revokeKey(keyId: string) {
    if (!confirm("Revoke this API key? This cannot be undone.")) return;
    await fetch(`/api/keys?id=${keyId}`, { method: "DELETE" });
    await fetchKeys();
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">API Keys</h1>

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
            <Button onClick={createKey} disabled={loading}>
              {loading ? "Generating..." : "Generate Key"}
            </Button>
          </div>
          {newKey && (
            <div className="mt-4 p-4 rounded-md bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800">
              <p className="text-sm font-medium text-green-800 dark:text-green-200 mb-2">
                Copy this key now — it will not be shown again.
              </p>
              <code className="text-xs break-all bg-white dark:bg-black px-2 py-1 rounded block">
                {newKey}
              </code>
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
