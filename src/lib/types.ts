// ─── Agent Status ───
export const AGENT_STATUSES = ["active", "suspended", "archived"] as const;
export type AgentStatus = (typeof AGENT_STATUSES)[number];

// ─── API Key Status ───
export const API_KEY_STATUSES = ["active", "revoked"] as const;
export type ApiKeyStatus = (typeof API_KEY_STATUSES)[number];

// ─── Transaction Types ───
export const TRANSACTION_TYPES = [
  "credit",
  "debit",
  "hold",
  "release",
  "refund",
] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

// ─── Transaction Status ───
export const TRANSACTION_STATUSES = [
  "pending",
  "completed",
  "failed",
  "reversed",
] as const;
export type TransactionStatus = (typeof TRANSACTION_STATUSES)[number];

// ─── Action Status ───
export const ACTION_STATUSES = [
  "pending",
  "authorized",
  "executing",
  "completed",
  "failed",
  "denied",
] as const;
export type ActionStatus = (typeof ACTION_STATUSES)[number];

// ─── Wallet Status ───
export const WALLET_STATUSES = ["active", "frozen", "closed"] as const;
export type WalletStatus = (typeof WALLET_STATUSES)[number];

// ─── Permissions ───
export const PERMISSIONS = [
  "payments:create",
  "tools:execute",
  "logs:read",
  "wallet:read",
] as const;
export type Permission = (typeof PERMISSIONS)[number];

// ─── Action Types ───
export const ACTION_TYPES = [
  "payments:create",
  "tools:echo",
  "tools:mock_api",
] as const;
export type ActionType = (typeof ACTION_TYPES)[number];

// ─── Permission Constraints ───
export interface PermissionConstraints {
  max_amount_cents?: number;
  allowed_categories?: string[];
  rate_limit_per_minute?: number;
}

// ─── Spending Policy ───
export interface SpendingPolicyConfig {
  max_per_transaction?: number; // cents
  max_daily_spend?: number; // cents
  allowed_categories?: string[];
  require_approval_above?: number; // cents
  cooldown_seconds?: number;
}

// ─── Execution Request ───
export interface ExecutionRequest {
  action: ActionType;
  params: Record<string, unknown>;
}

// ─── Execution Result ───
export interface ExecutionResult {
  success: boolean;
  action_request_id: string;
  data?: Record<string, unknown>;
  error?: string;
  cost_cents?: number;
}

// ─── API Key Creation Result ───
export interface ApiKeyCreationResult {
  id: string;
  key_prefix: string;
  raw_key: string; // shown once, never stored
  label: string;
  created_at: Date;
}
