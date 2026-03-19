import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/clerk";
import { db } from "@/lib/db";
import { agents, agentApiKeys, actionRequests, wallets } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { checkPermission } from "@/lib/engine/permissions";
import { checkSpendingPolicy } from "@/lib/engine/spending-policy";
import { getActionHandler } from "@/lib/engine/actions/registry";
import { debitWallet } from "@/lib/wallet/ledger";
import { createAuditLog } from "@/lib/engine/audit";

// POST /api/agents/[id]/test — Test execute an action via session auth
// Runs the same pipeline as the gateway but authenticates via Clerk session
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    // Verify ownership and load agent
    const agent = await db.query.agents.findFirst({
      where: and(eq(agents.id, id), eq(agents.ownerId, user.id)),
    });
    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }
    if (agent.status !== "active") {
      return NextResponse.json(
        { error: `Agent is ${agent.status}. Only active agents can execute actions.` },
        { status: 400 }
      );
    }

    // Need at least one active key to prove the agent is set up
    const key = await db.query.agentApiKeys.findFirst({
      where: and(eq(agentApiKeys.agentId, id), eq(agentApiKeys.status, "active")),
    });
    if (!key) {
      return NextResponse.json(
        { error: "No active API key. Generate one in the Keys tab first." },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { action, params: actionParams } = body as {
      action: string;
      params: Record<string, unknown>;
    };

    if (!action) {
      return NextResponse.json({ error: "action is required" }, { status: 400 });
    }

    const startTime = Date.now();

    // Get action handler
    const handler = getActionHandler(action);
    if (!handler) {
      return NextResponse.json({
        success: false,
        error: `Unknown action type: ${action}`,
      });
    }

    // Create action request record
    const [actionReq] = await db
      .insert(actionRequests)
      .values({
        agentId: id,
        actionType: action,
        params: actionParams ?? {},
        status: "pending",
      })
      .returning();

    // Check permission
    const costCents = handler.costCents(actionParams ?? {});
    const permResult = await checkPermission(id, handler.requiredPermission, {
      amount_cents: costCents,
      category: typeof actionParams?.category === "string" ? actionParams.category : undefined,
    });

    if (!permResult.allowed) {
      await db
        .update(actionRequests)
        .set({ status: "denied", error: permResult.reason, completedAt: new Date(), durationMs: Date.now() - startTime })
        .where(eq(actionRequests.id, actionReq.id));

      return NextResponse.json({
        success: false,
        action_request_id: actionReq.id,
        error: permResult.reason,
      });
    }

    // Check spending policy + wallet if action has cost
    if (costCents > 0) {
      const policyResult = await checkSpendingPolicy(
        id,
        costCents,
        typeof actionParams?.category === "string" ? actionParams.category : undefined
      );
      if (!policyResult.allowed) {
        await db
          .update(actionRequests)
          .set({ status: "denied", error: policyResult.reason, completedAt: new Date(), durationMs: Date.now() - startTime })
          .where(eq(actionRequests.id, actionReq.id));

        return NextResponse.json({
          success: false,
          action_request_id: actionReq.id,
          error: policyResult.reason,
        });
      }

      const wallet = await db.query.wallets.findFirst({
        where: eq(wallets.ownerId, user.id),
      });
      if (!wallet || wallet.balance < costCents) {
        await db
          .update(actionRequests)
          .set({ status: "denied", error: "Insufficient wallet balance", completedAt: new Date(), durationMs: Date.now() - startTime })
          .where(eq(actionRequests.id, actionReq.id));

        return NextResponse.json({
          success: false,
          action_request_id: actionReq.id,
          error: "Insufficient wallet balance",
        });
      }

      // Debit wallet
      const debitResult = await debitWallet(wallet.id, id, costCents, `Test: ${action}`, actionReq.id);
      if (debitResult) {
        await db
          .update(actionRequests)
          .set({ transactionId: debitResult.id })
          .where(eq(actionRequests.id, actionReq.id));
      }
    }

    // Execute
    await db
      .update(actionRequests)
      .set({ status: "executing" })
      .where(eq(actionRequests.id, actionReq.id));

    const result = await handler.execute(actionParams ?? {}, {
      agentId: id,
      ownerId: user.id,
    });
    const durationMs = Date.now() - startTime;

    // Record completion
    await db
      .update(actionRequests)
      .set({
        status: "completed",
        result,
        costCents,
        durationMs,
        completedAt: new Date(),
      })
      .where(eq(actionRequests.id, actionReq.id));

    await createAuditLog({
      actorType: "user",
      actorId: user.id,
      action: "action.completed",
      resourceType: "action_request",
      resourceId: actionReq.id,
      metadata: { action, source: "test_panel", durationMs },
    });

    return NextResponse.json({
      success: true,
      action_request_id: actionReq.id,
      data: result,
      cost_cents: costCents,
      duration_ms: durationMs,
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
