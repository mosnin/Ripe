import {
  pgTable,
  uuid,
  text,
  timestamp,
  bigint,
  integer,
  jsonb,
  index,
  uniqueIndex,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ─── Enums ───

export const agentStatusEnum = pgEnum("agent_status", [
  "active",
  "suspended",
  "archived",
]);

export const apiKeyStatusEnum = pgEnum("api_key_status", [
  "active",
  "revoked",
]);

export const transactionTypeEnum = pgEnum("transaction_type", [
  "credit",
  "debit",
  "hold",
  "release",
  "refund",
]);

export const transactionStatusEnum = pgEnum("transaction_status", [
  "pending",
  "completed",
  "failed",
  "reversed",
]);

export const actionStatusEnum = pgEnum("action_status", [
  "pending",
  "authorized",
  "executing",
  "completed",
  "failed",
  "denied",
]);

export const walletStatusEnum = pgEnum("wallet_status", [
  "active",
  "frozen",
  "closed",
]);

// ─── Users (synced from Clerk) ───

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  clerkId: text("clerk_id").notNull().unique(),
  email: text("email").notNull(),
  name: text("name"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Agents ───

export const agents = pgTable(
  "agents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    status: agentStatusEnum("status").default("active").notNull(),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [index("agents_owner_status_idx").on(table.ownerId, table.status)]
);

// ─── Agent API Keys ───

export const agentApiKeys = pgTable(
  "agent_api_keys",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    agentId: uuid("agent_id")
      .notNull()
      .references(() => agents.id, { onDelete: "cascade" }),
    keyPrefix: text("key_prefix").notNull(),
    keyHash: text("key_hash").notNull(),
    label: text("label").notNull().default("default"),
    status: apiKeyStatusEnum("status").default("active").notNull(),
    lastUsedAt: timestamp("last_used_at"),
    expiresAt: timestamp("expires_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    revokedAt: timestamp("revoked_at"),
  },
  (table) => [
    uniqueIndex("api_keys_hash_idx").on(table.keyHash),
    index("api_keys_agent_status_idx").on(table.agentId, table.status),
  ]
);

// ─── Agent Permissions ───

export const agentPermissions = pgTable(
  "agent_permissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    agentId: uuid("agent_id")
      .notNull()
      .references(() => agents.id, { onDelete: "cascade" }),
    permission: text("permission").notNull(),
    constraints: jsonb("constraints"),
    grantedAt: timestamp("granted_at").defaultNow().notNull(),
    grantedBy: uuid("granted_by").references(() => users.id),
  },
  (table) => [
    index("permissions_agent_idx").on(table.agentId),
  ]
);

// ─── Wallets ───

export const wallets = pgTable(
  "wallets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" })
      .unique(),
    balance: bigint("balance", { mode: "number" }).notNull().default(0),
    currency: text("currency").default("usd").notNull(),
    status: walletStatusEnum("status").default("active").notNull(),
    stripeCustomerId: text("stripe_customer_id"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [index("wallets_owner_idx").on(table.ownerId)]
);

// ─── Wallet Transactions ───

export const walletTransactions = pgTable(
  "wallet_transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    walletId: uuid("wallet_id")
      .notNull()
      .references(() => wallets.id, { onDelete: "cascade" }),
    agentId: uuid("agent_id").references(() => agents.id),
    type: transactionTypeEnum("type").notNull(),
    amount: bigint("amount", { mode: "number" }).notNull(),
    balanceAfter: bigint("balance_after", { mode: "number" }).notNull(),
    description: text("description"),
    referenceId: text("reference_id"),
    metadata: jsonb("metadata"),
    status: transactionStatusEnum("status").default("completed").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("transactions_wallet_created_idx").on(
      table.walletId,
      table.createdAt
    ),
  ]
);

// ─── Spending Policies ───

export const spendingPolicies = pgTable("spending_policies", {
  id: uuid("id").primaryKey().defaultRandom(),
  agentId: uuid("agent_id")
    .notNull()
    .references(() => agents.id, { onDelete: "cascade" })
    .unique(),
  maxPerTransaction: bigint("max_per_transaction", { mode: "number" }),
  maxDailySpend: bigint("max_daily_spend", { mode: "number" }),
  allowedCategories: text("allowed_categories").array(),
  requireApprovalAbove: bigint("require_approval_above", { mode: "number" }),
  cooldownSeconds: integer("cooldown_seconds"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Action Requests ───

export const actionRequests = pgTable(
  "action_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    agentId: uuid("agent_id")
      .notNull()
      .references(() => agents.id, { onDelete: "cascade" }),
    actionType: text("action_type").notNull(),
    params: jsonb("params").notNull(),
    status: actionStatusEnum("status").default("pending").notNull(),
    result: jsonb("result"),
    error: text("error"),
    costCents: bigint("cost_cents", { mode: "number" }).default(0),
    transactionId: uuid("transaction_id").references(
      () => walletTransactions.id
    ),
    durationMs: integer("duration_ms"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    completedAt: timestamp("completed_at"),
  },
  (table) => [
    index("action_requests_agent_created_idx").on(
      table.agentId,
      table.createdAt
    ),
  ]
);

// ─── Audit Logs ───

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorType: text("actor_type").notNull(), // 'user' | 'agent' | 'system'
    actorId: text("actor_id").notNull(),
    action: text("action").notNull(),
    resourceType: text("resource_type"),
    resourceId: text("resource_id"),
    metadata: jsonb("metadata"),
    ipAddress: text("ip_address"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("audit_actor_created_idx").on(
      table.actorType,
      table.actorId,
      table.createdAt
    ),
  ]
);

// ─── Relations ───

export const usersRelations = relations(users, ({ many, one }) => ({
  agents: many(agents),
  wallet: one(wallets),
}));

export const agentsRelations = relations(agents, ({ one, many }) => ({
  owner: one(users, { fields: [agents.ownerId], references: [users.id] }),
  apiKeys: many(agentApiKeys),
  permissions: many(agentPermissions),
  spendingPolicy: one(spendingPolicies),
  actionRequests: many(actionRequests),
}));

export const agentApiKeysRelations = relations(agentApiKeys, ({ one }) => ({
  agent: one(agents, {
    fields: [agentApiKeys.agentId],
    references: [agents.id],
  }),
}));

export const agentPermissionsRelations = relations(
  agentPermissions,
  ({ one }) => ({
    agent: one(agents, {
      fields: [agentPermissions.agentId],
      references: [agents.id],
    }),
    grantedByUser: one(users, {
      fields: [agentPermissions.grantedBy],
      references: [users.id],
    }),
  })
);

export const walletsRelations = relations(wallets, ({ one, many }) => ({
  owner: one(users, { fields: [wallets.ownerId], references: [users.id] }),
  transactions: many(walletTransactions),
}));

export const walletTransactionsRelations = relations(
  walletTransactions,
  ({ one }) => ({
    wallet: one(wallets, {
      fields: [walletTransactions.walletId],
      references: [wallets.id],
    }),
    agent: one(agents, {
      fields: [walletTransactions.agentId],
      references: [agents.id],
    }),
  })
);

export const spendingPoliciesRelations = relations(
  spendingPolicies,
  ({ one }) => ({
    agent: one(agents, {
      fields: [spendingPolicies.agentId],
      references: [agents.id],
    }),
  })
);

export const actionRequestsRelations = relations(
  actionRequests,
  ({ one }) => ({
    agent: one(agents, {
      fields: [actionRequests.agentId],
      references: [agents.id],
    }),
    transaction: one(walletTransactions, {
      fields: [actionRequests.transactionId],
      references: [walletTransactions.id],
    }),
  })
);
