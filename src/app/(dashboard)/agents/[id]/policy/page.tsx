"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { AgentBreadcrumb } from "@/components/agents/agent-breadcrumb";
import { formatCents } from "@/lib/utils";

interface Policy {
  maxPerTransaction: number | null;
  maxDailySpend: number | null;
  cooldownSeconds: number | null;
  requireApprovalAbove: number | null;
}

export default function AgentPolicyPage() {
  const params = useParams();
  const agentId = params.id as string;
  const [policy, setPolicy] = useState<Policy>({
    maxPerTransaction: null,
    maxDailySpend: null,
    cooldownSeconds: null,
    requireApprovalAbove: null,
  });
  const [agentName, setAgentName] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPolicy = useCallback(async () => {
    try {
      const [policyRes, agentRes] = await Promise.all([
        fetch(`/api/agents/${agentId}/policy`),
        fetch(`/api/agents/${agentId}`),
      ]);
      if (!policyRes.ok) throw new Error("Failed to load policy");
      const data = await policyRes.json();
      if (data.policy) {
        setPolicy(data.policy);
      }
      if (agentRes.ok) {
        const agentData = await agentRes.json();
        setAgentName(agentData.agent?.name ?? "Agent");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load policy");
    } finally {
      setPageLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    fetchPolicy();
  }, [fetchPolicy]);

  async function savePolicy() {
    setLoading(true);
    setSaved(false);
    setError(null);
    try {
      const res = await fetch(`/api/agents/${agentId}/policy`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          max_per_transaction: policy.maxPerTransaction,
          max_daily_spend: policy.maxDailySpend,
          cooldown_seconds: policy.cooldownSeconds,
          require_approval_above: policy.requireApprovalAbove,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to save policy");
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save policy");
    } finally {
      setLoading(false);
    }
  }

  if (pageLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm text-[var(--muted-foreground)]">Loading policy...</p>
      </div>
    );
  }

  return (
    <div>
      <AgentBreadcrumb agentId={agentId} agentName={agentName} currentPage="Spending Policy" />
      <h1 className="text-2xl font-bold mb-6">Spending Policy</h1>

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Configure Limits</CardTitle>
          <CardDescription>
            Set spending constraints for this agent. All amounts in cents.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 max-w-md">
            <div>
              <label className="block text-sm font-medium mb-1">
                Max Per Transaction (cents)
              </label>
              <Input
                type="number"
                value={policy.maxPerTransaction ?? ""}
                onChange={(e) =>
                  setPolicy({
                    ...policy,
                    maxPerTransaction: e.target.value
                      ? Number(e.target.value)
                      : null,
                  })
                }
                placeholder="e.g. 10000 ($100)"
              />
              {policy.maxPerTransaction != null && policy.maxPerTransaction > 0 && (
                <p className="text-xs text-[var(--muted-foreground)] mt-1">
                  = {formatCents(policy.maxPerTransaction)}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Max Daily Spend (cents)
              </label>
              <Input
                type="number"
                value={policy.maxDailySpend ?? ""}
                onChange={(e) =>
                  setPolicy({
                    ...policy,
                    maxDailySpend: e.target.value
                      ? Number(e.target.value)
                      : null,
                  })
                }
                placeholder="e.g. 100000 ($1,000)"
              />
              {policy.maxDailySpend != null && policy.maxDailySpend > 0 && (
                <p className="text-xs text-[var(--muted-foreground)] mt-1">
                  = {formatCents(policy.maxDailySpend)}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Cooldown Between Spends (seconds)
              </label>
              <Input
                type="number"
                value={policy.cooldownSeconds ?? ""}
                onChange={(e) =>
                  setPolicy({
                    ...policy,
                    cooldownSeconds: e.target.value
                      ? Number(e.target.value)
                      : null,
                  })
                }
                placeholder="e.g. 60"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Require Approval Above (cents)
              </label>
              <Input
                type="number"
                value={policy.requireApprovalAbove ?? ""}
                onChange={(e) =>
                  setPolicy({
                    ...policy,
                    requireApprovalAbove: e.target.value
                      ? Number(e.target.value)
                      : null,
                  })
                }
                placeholder="e.g. 50000 ($500)"
              />
              <p className="text-xs text-[var(--muted-foreground)] mt-1">
                Actions above this amount will be denied until manual approval is implemented.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Button onClick={savePolicy} disabled={loading}>
                {loading ? "Saving..." : "Save Policy"}
              </Button>
              {saved && (
                <span className="text-sm text-green-700 dark:text-green-400">
                  Policy saved!
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
