"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
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
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  const fetchPolicy = useCallback(async () => {
    const res = await fetch(`/api/agents/${agentId}/policy`);
    const data = await res.json();
    if (data.policy) {
      setPolicy(data.policy);
    }
  }, [agentId]);

  useEffect(() => {
    fetchPolicy();
  }, [fetchPolicy]);

  async function savePolicy() {
    setLoading(true);
    setSaved(false);
    try {
      await fetch(`/api/agents/${agentId}/policy`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          max_per_transaction: policy.maxPerTransaction,
          max_daily_spend: policy.maxDailySpend,
          cooldown_seconds: policy.cooldownSeconds,
          require_approval_above: policy.requireApprovalAbove,
        }),
      });
      setSaved(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Spending Policy</h1>

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
              {policy.maxPerTransaction && (
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
              {policy.maxDailySpend && (
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
            </div>

            <div className="flex items-center gap-3">
              <Button onClick={savePolicy} disabled={loading}>
                {loading ? "Saving..." : "Save Policy"}
              </Button>
              {saved && (
                <span className="text-sm text-green-600">Saved!</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
