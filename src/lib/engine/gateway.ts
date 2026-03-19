import { authenticateAgent } from "@/lib/auth/agent-auth";
import { checkPermission } from "./permissions";
import { checkSpendingPolicy } from "./spending-policy";
import { getActionHandler } from "./actions/registry";
import { debitWallet } from "@/lib/wallet/ledger";
import { createAuditLog } from "./audit";
import { db } from "@/lib/db";
import { actionRequests, wallets } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type { ExecutionRequest, ExecutionResult } from "@/lib/types";

/**
 * The execution gateway. All agent actions pass through this pipeline:
 * 1. Authenticate agent (API key)
 * 2. Validate request
 * 3. Check agent status
 * 4. Check permission
 * 5. Resolve action handler and cost
 * 6. Check spending policy (if action has cost)
 * 7. Check wallet balance (if action has cost)
 * 8. Execute action
 * 9. Record debit transaction (if action had cost)
 * 10. Record action log
 * 11. Record audit log
 * 12. Return result
 */
export async function executeAction(
  authHeader: string | null,
  request: ExecutionRequest
): Promise<ExecutionResult> {
  const startTime = Date.now();

  // Step 1: Authenticate
  const authResult = await authenticateAgent(authHeader);
  if (!authResult) {
    return {
      success: false,
      action_request_id: "",
      error: "Authentication failed: invalid or expired API key",
    };
  }

  const { agent, owner } = authResult;

  // Step 2: Resolve action handler
  const handler = getActionHandler(request.action);
  if (!handler) {
    return {
      success: false,
      action_request_id: "",
      error: `Unknown action type: ${request.action}`,
    };
  }

  // Create action request record
  const [actionReq] = await db
    .insert(actionRequests)
    .values({
      agentId: agent.id,
      actionType: request.action,
      params: request.params,
      status: "pending",
    })
    .returning();

  try {
    // Step 3: Check permission
    const permResult = await checkPermission(
      agent.id,
      handler.requiredPermission,
      {
        amount_cents: handler.costCents(request.params),
        category: typeof request.params.category === "string"
          ? request.params.category
          : undefined,
      }
    );

    if (!permResult.allowed) {
      await updateActionRequest(actionReq.id, "denied", null, permResult.reason);
      await createAuditLog({
        actorType: "agent",
        actorId: agent.id,
        action: "action.denied",
        resourceType: "action_request",
        resourceId: actionReq.id,
        metadata: { reason: permResult.reason, action: request.action },
      });
      return {
        success: false,
        action_request_id: actionReq.id,
        error: permResult.reason,
      };
    }

    // Mark as authorized
    await updateActionRequest(actionReq.id, "authorized");

    // Step 4: Calculate cost and check spending policy
    const costCents = handler.costCents(request.params);

    if (costCents > 0) {
      // Check spending policy
      const policyResult = await checkSpendingPolicy(
        agent.id,
        costCents,
        typeof request.params.category === "string"
          ? request.params.category
          : undefined
      );

      if (!policyResult.allowed) {
        await updateActionRequest(actionReq.id, "denied", null, policyResult.reason);
        return {
          success: false,
          action_request_id: actionReq.id,
          error: policyResult.reason,
        };
      }

      // Check wallet balance
      const wallet = await db.query.wallets.findFirst({
        where: eq(wallets.ownerId, owner.id),
      });

      if (!wallet || wallet.balance < costCents) {
        const reason = "Insufficient wallet balance";
        await updateActionRequest(actionReq.id, "denied", null, reason);
        return {
          success: false,
          action_request_id: actionReq.id,
          error: reason,
        };
      }

      // Debit wallet
      const debitResult = await debitWallet(
        wallet.id,
        agent.id,
        costCents,
        `Action: ${request.action}`,
        actionReq.id
      );

      if (!debitResult) {
        const reason = "Failed to debit wallet (concurrent balance change)";
        await updateActionRequest(actionReq.id, "denied", null, reason);
        return {
          success: false,
          action_request_id: actionReq.id,
          error: reason,
        };
      }

      // Update action request with transaction ID
      await db
        .update(actionRequests)
        .set({ transactionId: debitResult.id })
        .where(eq(actionRequests.id, actionReq.id));
    }

    // Step 5: Execute action
    await updateActionRequest(actionReq.id, "executing");

    const result = await handler.execute(request.params, {
      agentId: agent.id,
      ownerId: owner.id,
    });

    const durationMs = Date.now() - startTime;

    // Step 6: Record completion
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

    // Step 7: Audit log
    await createAuditLog({
      actorType: "agent",
      actorId: agent.id,
      action: "action.completed",
      resourceType: "action_request",
      resourceId: actionReq.id,
      metadata: {
        action_type: request.action,
        cost_cents: costCents,
        duration_ms: durationMs,
      },
    });

    return {
      success: true,
      action_request_id: actionReq.id,
      data: result,
      cost_cents: costCents,
    };
  } catch (error) {
    const durationMs = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    await updateActionRequest(
      actionReq.id,
      "failed",
      null,
      errorMessage,
      durationMs
    );

    await createAuditLog({
      actorType: "agent",
      actorId: agent.id,
      action: "action.failed",
      resourceType: "action_request",
      resourceId: actionReq.id,
      metadata: { error: errorMessage, action: request.action },
    });

    return {
      success: false,
      action_request_id: actionReq.id,
      error: errorMessage,
    };
  }
}

async function updateActionRequest(
  id: string,
  status: string,
  result?: Record<string, unknown> | null,
  error?: string | null,
  durationMs?: number
) {
  const updates: Record<string, unknown> = { status };
  if (result !== undefined) updates.result = result;
  if (error !== undefined) updates.error = error;
  if (durationMs !== undefined) updates.durationMs = durationMs;
  if (status === "completed" || status === "failed" || status === "denied") {
    updates.completedAt = new Date();
  }

  await db
    .update(actionRequests)
    .set(updates)
    .where(eq(actionRequests.id, id));
}
