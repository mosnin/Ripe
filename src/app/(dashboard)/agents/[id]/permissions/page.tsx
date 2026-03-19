"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AgentBreadcrumb } from "@/components/agents/agent-breadcrumb";
import { PERMISSIONS } from "@/lib/types";

interface Permission {
  id: string;
  permission: string;
  constraints: Record<string, unknown> | null;
  grantedAt: string;
}

export default function AgentPermissionsPage() {
  const params = useParams();
  const agentId = params.id as string;
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [agentName, setAgentName] = useState<string>("");
  const [selectedPermission, setSelectedPermission] = useState(PERMISSIONS[0]);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPermissions = useCallback(async () => {
    try {
      // Fetch agent name alongside permissions
      const [permRes, agentRes] = await Promise.all([
        fetch(`/api/agents/${agentId}/permissions`),
        fetch(`/api/agents/${agentId}`),
      ]);
      if (!permRes.ok) throw new Error("Failed to load permissions");
      const permData = await permRes.json();
      setPermissions(permData.permissions ?? []);
      if (agentRes.ok) {
        const agentData = await agentRes.json();
        setAgentName(agentData.agent?.name ?? "Agent");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load permissions");
    } finally {
      setPageLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  async function grantPerm() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/agents/${agentId}/permissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permission: selectedPermission }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to grant permission");
      }
      await fetchPermissions();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to grant permission");
    } finally {
      setLoading(false);
    }
  }

  async function revokePerm(permissionId: string) {
    setError(null);
    try {
      const res = await fetch(
        `/api/agents/${agentId}/permissions?permission_id=${permissionId}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error("Failed to revoke permission");
      await fetchPermissions();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to revoke permission");
    }
  }

  const grantedPerms = new Set(permissions.map((p) => p.permission));

  if (pageLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm text-[var(--muted-foreground)]">Loading permissions...</p>
      </div>
    );
  }

  return (
    <div>
      <AgentBreadcrumb agentId={agentId} agentName={agentName} currentPage="Permissions" />
      <h1 className="text-2xl font-bold mb-6">Permissions</h1>

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
          {error}
        </div>
      )}

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Grant Permission</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">
                Permission
              </label>
              <select
                value={selectedPermission}
                onChange={(e) => setSelectedPermission(e.target.value as typeof selectedPermission)}
                className="flex h-10 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
              >
                {PERMISSIONS.map((p) => (
                  <option key={p} value={p} disabled={grantedPerms.has(p)}>
                    {p} {grantedPerms.has(p) ? "(granted)" : ""}
                  </option>
                ))}
              </select>
            </div>
            <Button
              onClick={grantPerm}
              disabled={loading || grantedPerms.has(selectedPermission)}
            >
              {loading ? "Granting..." : "Grant"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Current Permissions</CardTitle>
        </CardHeader>
        <CardContent>
          {permissions.length === 0 ? (
            <p className="text-sm text-[var(--muted-foreground)]">
              No permissions granted. This agent cannot execute any actions.
            </p>
          ) : (
            <div className="space-y-3">
              {permissions.map((perm) => (
                <div
                  key={perm.id}
                  className="flex items-center justify-between rounded-md border border-[var(--border)] p-3"
                >
                  <div>
                    <Badge variant="outline">{perm.permission}</Badge>
                    <p className="text-xs text-[var(--muted-foreground)] mt-1">
                      Granted {new Date(perm.grantedAt).toLocaleDateString()}
                      {perm.constraints &&
                        ` — Constraints: ${JSON.stringify(perm.constraints)}`}
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => revokePerm(perm.id)}
                  >
                    Revoke
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
