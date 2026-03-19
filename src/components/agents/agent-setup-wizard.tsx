import Link from "next/link";
import { Check, Circle, ArrowRight } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface SetupStep {
  label: string;
  description: string;
  href: string;
  complete: boolean;
}

export function AgentSetupWizard({
  agentId,
  hasKeys,
  hasPermissions,
  hasPolicy,
}: {
  agentId: string;
  hasKeys: boolean;
  hasPermissions: boolean;
  hasPolicy: boolean;
}) {
  const steps: SetupStep[] = [
    {
      label: "Generate API Key",
      description: "Create an API key so your agent can authenticate",
      href: `/agents/${agentId}/keys`,
      complete: hasKeys,
    },
    {
      label: "Set Permissions",
      description: "Grant permissions for the actions your agent can execute",
      href: `/agents/${agentId}/permissions`,
      complete: hasPermissions,
    },
    {
      label: "Configure Spending Policy",
      description: "Set transaction limits and daily spend caps",
      href: `/agents/${agentId}/policy`,
      complete: hasPolicy,
    },
  ];

  const completedCount = steps.filter((s) => s.complete).length;
  const allComplete = completedCount === steps.length;

  if (allComplete) return null;

  // Find the first incomplete step
  const nextStep = steps.find((s) => !s.complete);

  return (
    <Card className="mb-6 border-blue-200 dark:border-blue-800">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">
            Setup Progress ({completedCount}/{steps.length})
          </CardTitle>
          <div className="flex gap-1">
            {steps.map((step, i) => (
              <div
                key={i}
                className={`h-2 w-8 rounded-full ${
                  step.complete
                    ? "bg-green-500 dark:bg-green-400"
                    : "bg-[var(--muted)]"
                }`}
              />
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {steps.map((step, i) => (
            <Link
              key={i}
              href={step.href}
              className={`flex items-center gap-3 rounded-md border p-3 transition-colors ${
                step.complete
                  ? "border-[var(--border)] opacity-60"
                  : step === nextStep
                    ? "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950"
                    : "border-[var(--border)]"
              }`}
            >
              {step.complete ? (
                <Check className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0" />
              ) : (
                <Circle className="h-5 w-5 text-[var(--muted-foreground)] shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${step.complete ? "line-through" : ""}`}>
                  {step.label}
                </p>
                <p className="text-xs text-[var(--muted-foreground)]">
                  {step.description}
                </p>
              </div>
              {!step.complete && step === nextStep && (
                <ArrowRight className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
              )}
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
