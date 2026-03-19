import type { ActionType } from "@/lib/types";
import { handlePaymentCreate } from "./payments";
import { handleToolsEcho, handleToolsMockApi } from "./tools";

interface ActionHandler {
  requiredPermission: string;
  costCents: (params: Record<string, unknown>) => number;
  execute: (
    params: Record<string, unknown>,
    context: { agentId: string; ownerId: string }
  ) => Promise<Record<string, unknown>>;
}

const actionRegistry: Record<string, ActionHandler> = {
  "payments:create": {
    requiredPermission: "payments:create",
    costCents: (params) => Number(params.amount_cents ?? 0),
    execute: handlePaymentCreate,
  },
  "tools:echo": {
    requiredPermission: "tools:execute",
    costCents: () => 0,
    execute: handleToolsEcho,
  },
  "tools:mock_api": {
    requiredPermission: "tools:execute",
    costCents: () => 10, // 10 cents per mock API call
    execute: handleToolsMockApi,
  },
};

export function getActionHandler(
  actionType: string
): ActionHandler | undefined {
  return actionRegistry[actionType];
}

export function getRegisteredActions(): string[] {
  return Object.keys(actionRegistry);
}
