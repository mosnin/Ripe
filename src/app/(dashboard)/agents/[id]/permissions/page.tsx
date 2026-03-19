"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  const [selectedPermission, setSelectedPermission] = useState(PERMISSIONS[0]);
  const [loading, setLoading] = useState(false);

  const fetchPermissions = useCallback(async () => {
    const res = await fetch(`/api/agents/${agentId}/permissions`);
    const data = await res.json();
    setPermissions(data.permissions ?? []);
  }, [agentId]);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  async function grantPerm() {
    setLoading(true);
    try {
      await fetch(`/api/agents/${agentId}/permissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permission: selectedPermission }),
      });
      await fetchPermissions();
    } finally {
      setLoading(false);
    }
  }

  async function revokePerm(permissionId: string) {
    await fetch(
      `/api/agents/${agentId}/permissions?permission_id=${permissionId}`,
      { method: "DELETE" }
    );
    await fetchPermissions();
  }

  const grantedPerms = new Set(permissions.map((p) => p.permission));

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Permissions</h1>

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
            <Button onClick={grantPerm} disabled={loading}>
              Grant
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
