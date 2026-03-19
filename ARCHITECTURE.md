# Agent Identity + Wallet Layer — Architecture Blueprint

## 1. Product Model

**What it is:** A developer platform that provides identity, permissions, wallet, and execution infrastructure for AI agents. Think "Stripe + OAuth for agents."

**Problem it solves:** AI agents increasingly need to authenticate, spend money, and take actions on behalf of humans/orgs. Today there's no standard infrastructure for this. Developers hack together ad-hoc solutions with no audit trail, no spending controls, and no permission boundaries.

**Who it's for:** Developers and businesses building AI agents that need to act as controlled economic actors — spending money, calling APIs, executing workflows — under explicit constraints.

**Why it matters:** As agents become autonomous economic participants, the infrastructure layer that provides identity + permissions + wallet + execution control becomes foundational. This is that layer.

---

## 2. MVP Definition

### Must Have (v1)
- Clerk-based human auth (sign up, sign in, session management)
- Agent CRUD (create, list, view, update status, delete)
- Agent API key generation (create, revoke, list — hashed storage)
- Capability-based permission system (resource:action scopes)
- Internal wallet/ledger (balance tracking, transaction history)
- Spending policies (per-agent caps)
- Execution gateway (auth → permissions → policy → execute → log)
- Dashboard: agents list, agent detail, wallet, transactions, logs, API keys
- Stripe Checkout for wallet funding

### Should Have (v1.1)
- Organization support
- Rate limiting on execution gateway
- Webhook delivery for events
- Spending policy: category restrictions, cooldown windows
- Agent SDK (TypeScript)

### Later (v2+)
- Multi-agent orchestration
- Tool registry / marketplace
- Third-party OAuth integrations
- Agent-to-agent communication
- Advanced analytics
- Organization roles and team management

---

## 3. System Architecture

```
┌─────────────────────────────────────────────────┐
│                  HUMAN LAYER                     │
│    Clerk Auth → User Sessions → Dashboard UI     │
└──────────────────────┬──────────────────────────┘
                       │ owns
┌──────────────────────▼──────────────────────────┐
│                 AGENT LAYER                      │
│   Agent Identity → API Keys → Permission Policy  │
└──────────────────────┬──────────────────────────┘
                       │ acts through
┌──────────────────────▼──────────────────────────┐
│              EXECUTION GATEWAY                   │
│  Auth → Permissions → Spending Policy → Execute  │
└──────────┬───────────────────────┬──────────────┘
           │                       │
┌──────────▼──────────┐  ┌────────▼───────────────┐
│    WALLET LAYER     │  │     ACTION LAYER        │
│  Ledger + Stripe    │  │  Mock tools, payments   │
└─────────────────────┘  └────────────────────────┘
```

Four primitives:
1. **Identity** — Clerk for humans, platform-issued IDs + API keys for agents
2. **Permissions** — Capability-based: `resource:action` with optional constraints
3. **Wallet** — Internal ledger backed by Stripe for funding
4. **Execution** — Server-side gateway that enforces all checks before action

---

## 4. Data Model

### Enums
- `agent_status`: active, suspended, archived
- `api_key_status`: active, revoked
- `transaction_type`: credit, debit, hold, release, refund
- `transaction_status`: pending, completed, failed, reversed
- `action_status`: pending, authorized, executing, completed, failed, denied
- `wallet_status`: active, frozen, closed

### Tables

**users** (synced from Clerk)
- id: uuid PK
- clerk_id: text UNIQUE NOT NULL
- email: text NOT NULL
- name: text
- created_at, updated_at

**agents**
- id: uuid PK
- owner_id: uuid FK → users.id NOT NULL
- name: text NOT NULL
- description: text
- status: agent_status DEFAULT 'active'
- metadata: jsonb
- created_at, updated_at

**agent_api_keys**
- id: uuid PK
- agent_id: uuid FK → agents.id NOT NULL
- key_prefix: text NOT NULL (e.g., "ripe_ak_")
- key_hash: text NOT NULL
- label: text
- status: api_key_status DEFAULT 'active'
- last_used_at: timestamp
- expires_at: timestamp
- created_at, revoked_at

**agent_permissions**
- id: uuid PK
- agent_id: uuid FK → agents.id NOT NULL
- permission: text NOT NULL (e.g., "payments:create")
- constraints: jsonb (optional caps, restrictions)
- granted_at: timestamp
- granted_by: uuid FK → users.id

**wallets**
- id: uuid PK
- owner_id: uuid FK → users.id NOT NULL
- balance: bigint NOT NULL DEFAULT 0 (cents)
- currency: text DEFAULT 'usd'
- status: wallet_status DEFAULT 'active'
- stripe_customer_id: text
- created_at, updated_at

**wallet_transactions**
- id: uuid PK
- wallet_id: uuid FK → wallets.id NOT NULL
- agent_id: uuid FK → agents.id (nullable — human deposits have no agent)
- type: transaction_type NOT NULL
- amount: bigint NOT NULL (cents)
- balance_after: bigint NOT NULL
- description: text
- reference_id: text (Stripe payment intent ID, action request ID, etc.)
- metadata: jsonb
- status: transaction_status DEFAULT 'completed'
- created_at

**spending_policies**
- id: uuid PK
- agent_id: uuid FK → agents.id NOT NULL UNIQUE
- max_per_transaction: bigint (cents)
- max_daily_spend: bigint (cents)
- allowed_categories: text[] (nullable)
- require_approval_above: bigint (cents, nullable)
- cooldown_seconds: int (nullable)
- created_at, updated_at

**action_requests**
- id: uuid PK
- agent_id: uuid FK → agents.id NOT NULL
- action_type: text NOT NULL
- params: jsonb NOT NULL
- status: action_status DEFAULT 'pending'
- result: jsonb
- error: text
- cost_cents: bigint DEFAULT 0
- transaction_id: uuid FK → wallet_transactions.id (nullable)
- duration_ms: int
- created_at, completed_at

**audit_logs**
- id: uuid PK
- actor_type: text NOT NULL ('user' | 'agent' | 'system')
- actor_id: text NOT NULL
- action: text NOT NULL
- resource_type: text
- resource_id: text
- metadata: jsonb
- ip_address: text
- created_at

### Key Indexes
- agents: (owner_id, status)
- agent_api_keys: (key_hash) UNIQUE, (agent_id, status)
- wallet_transactions: (wallet_id, created_at DESC)
- action_requests: (agent_id, created_at DESC)
- audit_logs: (actor_type, actor_id, created_at DESC)
- spending_policies: (agent_id) UNIQUE

---

## 5. Identity Architecture

**Human layer:** Clerk handles all human auth. We sync Clerk user data to our `users` table via Clerk webhooks (user.created, user.updated). The `clerk_id` is the join key.

**Agent layer:** Agents are platform entities owned by users. They authenticate via API keys, not Clerk sessions. This is a deliberate separation — agents are NOT users.

**Organizations:** Deferred to v1.1. For MVP, agents belong to individual users. The schema supports adding an `org_id` to agents later without migration pain.

**Recommended path:** Single-user ownership model. Clerk's user object → our `users` table → agents belong to `owner_id`. Clean, simple, shippable.

---

## 6. Agent Authentication Design

**Key format:** `ripe_ak_{random_32_bytes_base62}`
- Prefix `ripe_ak_` makes keys identifiable in logs and config files
- The full key is shown exactly once at creation time

**Storage:**
- `key_prefix`: first 8 chars of the random portion (for display/identification)
- `key_hash`: SHA-256 hash of the full key
- Raw key is NEVER stored after creation

**Validation flow:**
1. Agent sends `Authorization: Bearer ripe_ak_xxxxx`
2. Server computes SHA-256 of the full key
3. Looks up `agent_api_keys` by `key_hash` where `status = 'active'`
4. Verifies key hasn't expired
5. Updates `last_used_at`
6. Returns the associated agent (with owner context)

**Rotation:** Create new key → revoke old key. No in-place rotation.

**Revocation:** Sets `status = 'revoked'` and `revoked_at`. Immediate effect.

---

## 7. Permissions Architecture

**Model:** Capability-based. Each permission is `resource:action` with optional constraints.

**Core permissions for v1:**
- `payments:create` — create payment/charge requests
- `tools:execute` — call registered tools/actions
- `logs:read` — read own execution logs
- `wallet:read` — read wallet balance

**Constraint structure (JSON):**
```json
{
  "max_amount_cents": 10000,
  "allowed_categories": ["compute", "api_calls"],
  "rate_limit_per_minute": 10
}
```

**Enforcement:** The execution gateway checks permissions BEFORE any action. No client-side shortcuts.

**Evaluation:**
1. Look up all permissions for the agent
2. Check if any match the requested `resource:action`
3. If matched, evaluate constraints against request params
4. Deny if no matching permission or constraint violated

---

## 8. Wallet Architecture

**Model:** Internal ledger with cent-precision integers. NOT a stored-value wallet in the legal sense — it's prepaid platform credits.

**Balance representation:** `bigint` in cents. All arithmetic in integers. No floating point.

**Transaction recording:** Every balance change creates a `wallet_transactions` row with `balance_after` for point-in-time auditability.

**Funding:** User pays via Stripe Checkout → webhook confirms payment → credit transaction added to ledger.

**Spending:** Agent action costs deducted as debit transactions. The execution gateway checks balance before executing.

**Concurrency:** Use Postgres `SELECT ... FOR UPDATE` on wallet row during debit operations to prevent double-spending.

---

## 9. Stripe Architecture

**MVP Stripe model:**
- Each user gets a Stripe Customer (created lazily on first fund)
- Wallet funding uses Stripe Checkout Sessions in `payment` mode
- On `checkout.session.completed` webhook, credit the internal ledger
- Agent "payments" are internal ledger debits — they do NOT create real Stripe charges on behalf of agents

**What Stripe handles:** Collecting money from humans into the platform.
**What the internal ledger handles:** Tracking balances, agent spending, transaction history.

**Why not Stripe Connect?** Overkill for MVP. We're not paying out to agents. We're collecting funds and tracking internal spend.

**Compliance note:** The internal balance is "platform credits" not stored value. This avoids money transmitter classification for MVP. If the platform later needs to pay out, that changes the regulatory picture.

---

## 10. Spending Policy Model

**Per-agent policy (v1):**
- `max_per_transaction`: reject single actions above this amount
- `max_daily_spend`: rolling 24h spend cap
- `require_approval_above`: flag for future manual approval flow (v1: just reject)
- `cooldown_seconds`: minimum time between spend actions
- `allowed_categories`: restrict to certain action categories

**Enforcement order:**
1. Check `max_per_transaction`
2. Check `max_daily_spend` (sum of last 24h debits)
3. Check `cooldown_seconds` (time since last debit)
4. Check `allowed_categories`
5. Check wallet balance ≥ requested amount

---

## 11. Execution Gateway Architecture

```
POST /api/v1/agent/execute

Headers: Authorization: Bearer ripe_ak_xxxxx
Body: { "action": "payments:create", "params": { ... } }

Pipeline:
1. Parse + validate request (Zod)
2. Authenticate agent (API key → agent + owner)
3. Check agent status (must be 'active')
4. Check permission (agent has required capability)
5. Check spending policy (if action has cost)
6. Check wallet balance (if action has cost)
7. Execute action (dispatch to action handler)
8. Record transaction (if action had cost)
9. Record action log
10. Record audit log
11. Return structured result
```

**Action handlers:** A registry of `action_type → handler function`. V1 has:
- `payments:create` — deduct from wallet, record as payment
- `tools:echo` — mock tool that echoes params (free)
- `tools:mock_api` — simulates an outbound API call (small cost)

---

## 12. State Machines

**Agent lifecycle:** `active` ↔ `suspended` → `archived`
- active → suspended (owner or system)
- suspended → active (owner reactivation)
- active → archived (owner deletion)
- suspended → archived (owner deletion)

**API key lifecycle:** `active` → `revoked`
- One-way. Revoked keys cannot be reactivated.

**Transaction lifecycle:** `pending` → `completed` | `failed` | `reversed`

**Action request lifecycle:** `pending` → `authorized` → `executing` → `completed` | `failed`
- `pending` → `denied` (permission/policy check failed)

---

## 13. Authorization Model

**Human owner can:**
- CRUD agents they own
- Manage API keys for their agents
- Set permissions and policies for their agents
- Fund their wallet
- View all transactions and logs for their agents

**Agent can (via API key):**
- Execute actions permitted by their policy
- Read own logs (if permitted)

**System/admin can:**
- View all resources (future admin panel)
- Suspend agents
- Freeze wallets

**Ownership enforcement:** Every agent operation checks `agent.owner_id === currentUser.id`. No cross-user access.

---

## 14. App Architecture

```
src/
├── app/
│   ├── (marketing)/          # Landing page
│   │   ├── page.tsx
│   │   └── layout.tsx
│   ├── (dashboard)/          # Authenticated dashboard
│   │   ├── layout.tsx
│   │   ├── dashboard/
│   │   │   └── page.tsx      # Overview
│   │   ├── agents/
│   │   │   ├── page.tsx      # Agent list
│   │   │   ├── new/page.tsx  # Create agent
│   │   │   └── [id]/
│   │   │       ├── page.tsx  # Agent detail
│   │   │       ├── keys/page.tsx
│   │   │       ├── permissions/page.tsx
│   │   │       ├── policy/page.tsx
│   │   │       └── logs/page.tsx
│   │   ├── wallet/
│   │   │   ├── page.tsx      # Balance + fund
│   │   │   └── transactions/page.tsx
│   │   └── settings/
│   │       └── page.tsx
│   ├── api/
│   │   ├── v1/
│   │   │   └── agent/
│   │   │       └── execute/route.ts  # Execution gateway
│   │   ├── agents/                    # Agent CRUD
│   │   ├── keys/                      # API key management
│   │   ├── wallet/                    # Wallet operations
│   │   └── webhooks/
│   │       ├── clerk/route.ts
│   │       └── stripe/route.ts
│   ├── sign-in/[[...sign-in]]/page.tsx
│   ├── sign-up/[[...sign-up]]/page.tsx
│   ├── layout.tsx
│   └── globals.css
├── lib/
│   ├── db/
│   │   ├── index.ts           # Drizzle client
│   │   ├── schema.ts          # Full schema
│   │   └── migrations/
│   ├── auth/
│   │   ├── clerk.ts           # Clerk helpers
│   │   └── agent-auth.ts      # API key auth
│   ├── engine/
│   │   ├── permissions.ts     # Permission checker
│   │   ├── spending-policy.ts # Policy enforcer
│   │   ├── gateway.ts         # Execution gateway
│   │   └── actions/           # Action handlers
│   │       ├── registry.ts
│   │       ├── payments.ts
│   │       └── tools.ts
│   ├── wallet/
│   │   ├── ledger.ts          # Balance operations
│   │   └── stripe.ts          # Stripe integration
│   ├── types.ts               # Shared types
│   └── utils.ts               # Shared utilities
├── components/
│   ├── ui/                    # Reusable UI components
│   ├── dashboard/             # Dashboard-specific components
│   └── agents/                # Agent-specific components
└── middleware.ts              # Clerk middleware
```

---

## 15. UI Page Map

| Page | Purpose | Key Elements |
|------|---------|--------------|
| `/` | Marketing landing | Hero, features, CTA |
| `/dashboard` | Owner overview | Agent count, balance, recent activity |
| `/agents` | Agent list | Table with status, actions, create button |
| `/agents/new` | Create agent | Name, description form |
| `/agents/[id]` | Agent detail | Status, info, quick links |
| `/agents/[id]/keys` | API keys | Create key, list keys, revoke |
| `/agents/[id]/permissions` | Permissions | Add/remove capabilities |
| `/agents/[id]/policy` | Spending policy | Configure limits |
| `/agents/[id]/logs` | Action logs | Filterable action history |
| `/wallet` | Wallet overview | Balance, fund button |
| `/wallet/transactions` | Transaction history | Filterable transaction list |
| `/settings` | Account settings | Profile, danger zone |

---

## 16. Build Order

**Phase 1: Foundation (Days 1-2)**
1. Init Next.js + TypeScript + Tailwind
2. Set up Drizzle + Neon schema
3. Integrate Clerk auth + middleware
4. Clerk webhook → user sync
5. Dashboard layout shell

**Phase 2: Agent Core (Days 3-4)**
6. Agent CRUD (create, list, detail, update status)
7. API key generation + hashed storage
8. Permission management
9. Spending policy CRUD

**Phase 3: Wallet (Days 5-6)**
10. Wallet creation + balance display
11. Stripe Checkout integration for funding
12. Stripe webhook → ledger credit
13. Transaction history

**Phase 4: Execution (Days 7-8)**
14. Execution gateway endpoint
15. Agent auth middleware
16. Permission + policy enforcement
17. Action handlers (payments, mock tools)
18. Action logging

**Phase 5: Polish (Days 9-10)**
19. Dashboard overview with stats
20. Audit log viewer
21. Error handling + edge cases
22. Basic rate limiting

---

## 17. Risks and Constraints

| Risk | Severity | Mitigation |
|------|----------|------------|
| Double-spending on wallet | High | Postgres row-level locks on debit |
| API key leak | High | Hash-only storage, show once |
| Permission bypass | High | Server-side enforcement only |
| Stripe webhook replay | Medium | Idempotency keys on transactions |
| Balance drift | Medium | Audit trail + balance_after field |
| Clerk webhook ordering | Low | Upsert on user sync |
| Legal: stored value laws | Medium | Frame as platform credits, not wallet |
| Scale: single wallet per user | Low | Sufficient for MVP |

**Safe to ship in v1:** Everything above with proper server-side enforcement.
**Should wait:** Real Stripe payouts, org support, multi-currency, agent SDK.

---

## V1 Verdict

1. **Sharpest MVP:** Agent CRUD + API keys + permissions + wallet + execution gateway + dashboard
2. **Clerk model:** Individual users only. Sync via webhook. No orgs in v1.
3. **Agent auth:** `ripe_ak_` prefixed keys, SHA-256 hashed, show-once
4. **Wallet/ledger:** Integer cents, Postgres-backed, transaction log with balance_after
5. **Stripe model:** Checkout Sessions for funding, internal ledger for spending. No Connect.
6. **ORM:** Drizzle — type-safe, lightweight, good Postgres support
7. **First 10 implementation steps:**
   1. `npx create-next-app` with TypeScript + Tailwind
   2. Install Drizzle + Clerk + Stripe + Zod
   3. Define full Drizzle schema
   4. Set up Clerk middleware + auth helpers
   5. Build user sync webhook
   6. Build agent CRUD API + UI
   7. Build API key system
   8. Build wallet + Stripe funding
   9. Build execution gateway
   10. Build dashboard pages
