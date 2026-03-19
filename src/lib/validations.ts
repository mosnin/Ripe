import { z } from "zod";
import { PERMISSIONS, ACTION_TYPES } from "./types";

export const createAgentSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
});

export const updateAgentStatusSchema = z.object({
  status: z.enum(["active", "suspended", "archived"]),
});

export const createApiKeySchema = z.object({
  agent_id: z.string().uuid(),
  label: z.string().min(1).max(50).default("default"),
});

export const grantPermissionSchema = z.object({
  agent_id: z.string().uuid(),
  permission: z.enum(PERMISSIONS),
  constraints: z
    .object({
      max_amount_cents: z.number().int().positive().optional(),
      allowed_categories: z.array(z.string()).optional(),
      rate_limit_per_minute: z.number().int().positive().optional(),
    })
    .optional(),
});

export const updateSpendingPolicySchema = z.object({
  agent_id: z.string().uuid(),
  max_per_transaction: z.number().int().positive().nullable().optional(),
  max_daily_spend: z.number().int().positive().nullable().optional(),
  allowed_categories: z.array(z.string()).nullable().optional(),
  require_approval_above: z.number().int().positive().nullable().optional(),
  cooldown_seconds: z.number().int().positive().nullable().optional(),
});

export const fundWalletSchema = z.object({
  amount_cents: z.number().int().min(100).max(10000000), // $1 to $100,000
});

export const executeActionSchema = z.object({
  action: z.enum(ACTION_TYPES),
  params: z.record(z.string(), z.unknown()),
});
