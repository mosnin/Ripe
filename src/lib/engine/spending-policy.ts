import { db } from "@/lib/db";
import { spendingPolicies, walletTransactions } from "@/lib/db/schema";
import { eq, and, gte, sql } from "drizzle-orm";

interface PolicyCheckResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Check if a spend action is allowed under the agent's spending policy.
 */
export async function checkSpendingPolicy(
  agentId: string,
  amountCents: number,
  category?: string
): Promise<PolicyCheckResult> {
  const policy = await db.query.spendingPolicies.findFirst({
    where: eq(spendingPolicies.agentId, agentId),
  });

  // No policy = no restrictions (but wallet balance still applies)
  if (!policy) return { allowed: true };

  // Check per-transaction limit
  if (
    policy.maxPerTransaction !== null &&
    policy.maxPerTransaction !== undefined &&
    amountCents > policy.maxPerTransaction
  ) {
    return {
      allowed: false,
      reason: `Amount ${amountCents} exceeds per-transaction limit of ${policy.maxPerTransaction} cents`,
    };
  }

  // Check daily spend limit
  if (policy.maxDailySpend !== null && policy.maxDailySpend !== undefined) {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const result = await db
      .select({
        total: sql<number>`COALESCE(SUM(${walletTransactions.amount}), 0)`,
      })
      .from(walletTransactions)
      .where(
        and(
          eq(walletTransactions.agentId, agentId),
          eq(walletTransactions.type, "debit"),
          eq(walletTransactions.status, "completed"),
          gte(walletTransactions.createdAt, twentyFourHoursAgo)
        )
      );

    const dailySpent = Number(result[0]?.total ?? 0);
    if (dailySpent + amountCents > policy.maxDailySpend) {
      return {
        allowed: false,
        reason: `Daily spend would reach ${dailySpent + amountCents} cents, exceeding limit of ${policy.maxDailySpend} cents`,
      };
    }
  }

  // Check allowed categories
  if (
    policy.allowedCategories &&
    policy.allowedCategories.length > 0 &&
    category &&
    !policy.allowedCategories.includes(category)
  ) {
    return {
      allowed: false,
      reason: `Category "${category}" is not allowed by spending policy`,
    };
  }

  // Check cooldown
  if (policy.cooldownSeconds !== null && policy.cooldownSeconds !== undefined) {
    const cooldownCutoff = new Date(
      Date.now() - policy.cooldownSeconds * 1000
    );

    const recentTx = await db.query.walletTransactions.findFirst({
      where: and(
        eq(walletTransactions.agentId, agentId),
        eq(walletTransactions.type, "debit"),
        gte(walletTransactions.createdAt, cooldownCutoff)
      ),
    });

    if (recentTx) {
      return {
        allowed: false,
        reason: `Cooldown period of ${policy.cooldownSeconds}s has not elapsed since last spend`,
      };
    }
  }

  // Check approval threshold
  if (
    policy.requireApprovalAbove !== null &&
    policy.requireApprovalAbove !== undefined &&
    amountCents > policy.requireApprovalAbove
  ) {
    return {
      allowed: false,
      reason: `Amount ${amountCents} exceeds manual approval threshold of ${policy.requireApprovalAbove} cents`,
    };
  }

  return { allowed: true };
}
