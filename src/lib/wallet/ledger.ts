import { db } from "@/lib/db";
import { wallets, walletTransactions } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";

/**
 * Get or create a wallet for a user.
 */
export async function getOrCreateWallet(ownerId: string) {
  const existing = await db.query.wallets.findFirst({
    where: eq(wallets.ownerId, ownerId),
  });

  if (existing) return existing;

  const [wallet] = await db
    .insert(wallets)
    .values({ ownerId })
    .onConflictDoNothing()
    .returning();

  if (!wallet) {
    // Race condition — re-fetch
    const w = await db.query.wallets.findFirst({
      where: eq(wallets.ownerId, ownerId),
    });
    if (!w) throw new Error("Failed to create wallet");
    return w;
  }

  return wallet;
}

/**
 * Credit a wallet (add funds). Used after Stripe payment confirmation.
 * Uses row-level locking to prevent race conditions.
 */
export async function creditWallet(
  walletId: string,
  amountCents: number,
  description: string,
  referenceId?: string
) {
  // Use raw SQL for SELECT ... FOR UPDATE
  const result = await db.execute(sql`
    UPDATE ${wallets}
    SET balance = balance + ${amountCents},
        updated_at = NOW()
    WHERE id = ${walletId}::uuid AND status = 'active'
    RETURNING balance
  `);

  const newBalance = Number(result.rows[0]?.balance);

  const [tx] = await db
    .insert(walletTransactions)
    .values({
      walletId,
      type: "credit",
      amount: amountCents,
      balanceAfter: newBalance,
      description,
      referenceId,
      status: "completed",
    })
    .returning();

  return tx;
}

/**
 * Debit a wallet (spend funds). Used by the execution gateway.
 * Returns null if insufficient balance.
 */
export async function debitWallet(
  walletId: string,
  agentId: string,
  amountCents: number,
  description: string,
  referenceId?: string
) {
  // Atomic update with balance check
  const result = await db.execute(sql`
    UPDATE ${wallets}
    SET balance = balance - ${amountCents},
        updated_at = NOW()
    WHERE id = ${walletId}::uuid
      AND status = 'active'
      AND balance >= ${amountCents}
    RETURNING balance
  `);

  if (result.rows.length === 0) {
    return null; // Insufficient balance or wallet not active
  }

  const newBalance = Number(result.rows[0]?.balance);

  const [tx] = await db
    .insert(walletTransactions)
    .values({
      walletId,
      agentId,
      type: "debit",
      amount: amountCents,
      balanceAfter: newBalance,
      description,
      referenceId,
      status: "completed",
    })
    .returning();

  return tx;
}

/**
 * Get transaction history for a wallet.
 */
export async function getTransactions(
  walletId: string,
  limit: number = 50,
  offset: number = 0
) {
  return db.query.walletTransactions.findMany({
    where: eq(walletTransactions.walletId, walletId),
    orderBy: (t, { desc }) => [desc(t.createdAt)],
    limit,
    offset,
  });
}
