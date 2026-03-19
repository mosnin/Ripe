"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AgentBreadcrumb } from "@/components/agents/agent-breadcrumb";

const ACTION_PRESETS: {
  action: string;
  label: string;
  description: string;
  defaultParams: Record<string, unknown>;
}[] = [
  {
    action: "tools:echo",
    label: "Echo",
    description: "Returns whatever you send. Free, no cost.",
    defaultParams: { message: "Hello from test panel!" },
  },
  {
    action: "tools:mock_api",
    label: "Mock API",
    description: "Simulates an outbound API call. Costs 10¢.",
    defaultParams: { url: "https://api.example.com/data", method: "GET" },
  },
  {
    action: "payments:create",
    label: "Payment",
    description: "Creates a mock payment. Cost = amount_cents.",
    defaultParams: { amount_cents: 100, recipient: "test@example.com", description: "Test payment" },
  },
];

interface TestResult {
  success: boolean;
  action_request_id?: string;
  data?: Record<string, unknown>;
  error?: string;
  cost_cents?: number;
  duration_ms?: number;
}

export default function AgentTestPage() {
  const params = useParams();
  const agentId = params.id as string;
  const [agentName, setAgentName] = useState("");
  const [selectedAction, setSelectedAction] = useState(ACTION_PRESETS[0].action);
  const [paramsJson, setParamsJson] = useState(
    JSON.stringify(ACTION_PRESETS[0].defaultParams, null, 2)
  );
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchAgent = useCallback(async () => {
    try {
      const res = await fetch(`/api/agents/${agentId}`);
      if (res.ok) {
        const data = await res.json();
        setAgentName(data.agent?.name ?? "Agent");
      }
    } catch {
      // ignore
    }
  }, [agentId]);

  useEffect(() => {
    fetchAgent();
  }, [fetchAgent]);

  function selectPreset(action: string) {
    setSelectedAction(action);
    const preset = ACTION_PRESETS.find((p) => p.action === action);
    if (preset) {
      setParamsJson(JSON.stringify(preset.defaultParams, null, 2));
    }
    setResult(null);
    setError(null);
  }

  async function executeTest() {
    setLoading(true);
    setResult(null);
    setError(null);

    let parsedParams: Record<string, unknown>;
    try {
      parsedParams = JSON.parse(paramsJson);
    } catch {
      setError("Invalid JSON in params");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/agents/${agentId}/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: selectedAction, params: parsedParams }),
      });
      const data = await res.json();
      if (data.error && !data.success && !data.action_request_id) {
        setError(data.error);
      } else {
        setResult(data);
      }
    } catch {
      setError("Failed to execute test action");
    } finally {
      setLoading(false);
    }
  }

  const selectedPreset = ACTION_PRESETS.find((p) => p.action === selectedAction);

  return (
    <div>
      <AgentBreadcrumb agentId={agentId} agentName={agentName} currentPage="Test" />
      <h1 className="text-2xl font-bold mb-6">Execution Playground</h1>

      {/* Action selector */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Select Action</CardTitle>
          <CardDescription>
            Choose an action to execute through the full gateway pipeline.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {ACTION_PRESETS.map((preset) => (
              <button
                key={preset.action}
                onClick={() => selectPreset(preset.action)}
                className={`rounded-md border p-3 text-left transition-colors ${
                  selectedAction === preset.action
                    ? "border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-950"
                    : "border-[var(--border)] hover:bg-[var(--accent)]"
                }`}
              >
                <p className="text-sm font-medium">{preset.label}</p>
                <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                  {preset.description}
                </p>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Params editor */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Parameters</CardTitle>
          <CardDescription>
            Edit the JSON params sent to <code className="text-xs">{selectedAction}</code>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <textarea
            value={paramsJson}
            onChange={(e) => setParamsJson(e.target.value)}
            rows={6}
            className="w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
            spellCheck={false}
          />
          <div className="flex items-center gap-3 mt-4">
            <Button onClick={executeTest} disabled={loading}>
              {loading ? "Executing..." : "Execute Action"}
            </Button>
            {selectedPreset && (
              <span className="text-xs text-[var(--muted-foreground)]">
                Cost: {selectedAction === "payments:create" ? "amount_cents value" : selectedAction === "tools:mock_api" ? "10¢" : "Free"}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
          {error}
        </div>
      )}

      {/* Result */}
      {result && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Result</CardTitle>
              <Badge variant={result.success ? "success" : "destructive"}>
                {result.success ? "Success" : "Failed"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {result.action_request_id && (
                <div className="flex gap-2 text-sm">
                  <span className="text-[var(--muted-foreground)]">Request ID:</span>
                  <code className="text-xs">{result.action_request_id}</code>
                </div>
              )}
              {result.duration_ms != null && (
                <div className="flex gap-2 text-sm">
                  <span className="text-[var(--muted-foreground)]">Duration:</span>
                  <span>{result.duration_ms}ms</span>
                </div>
              )}
              {result.cost_cents != null && result.cost_cents > 0 && (
                <div className="flex gap-2 text-sm">
                  <span className="text-[var(--muted-foreground)]">Cost:</span>
                  <span>{(result.cost_cents / 100).toFixed(2)} USD</span>
                </div>
              )}
              {result.error && (
                <div className="flex gap-2 text-sm">
                  <span className="text-red-600 dark:text-red-400">Error:</span>
                  <span>{result.error}</span>
                </div>
              )}
              {result.data && (
                <div>
                  <p className="text-sm text-[var(--muted-foreground)] mb-1">Response:</p>
                  <pre className="text-xs bg-[var(--muted)] p-3 rounded-md overflow-x-auto">
                    {JSON.stringify(result.data, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
