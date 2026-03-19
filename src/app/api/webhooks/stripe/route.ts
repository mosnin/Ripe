import { NextResponse } from "next/server";
import { stripe } from "@/lib/wallet/stripe";
import { creditWallet } from "@/lib/wallet/ledger";
import { createAuditLog } from "@/lib/engine/audit";
import { db } from "@/lib/db";
import { wallets } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type Stripe from "stripe";

export async function POST(req: Request) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch {
    return NextResponse.json(
      { error: "Invalid webhook signature" },
      { status: 400 }
    );
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const walletId = session.metadata?.wallet_id;
    const userId = session.metadata?.user_id;
    const amountTotal = session.amount_total;

    if (!walletId || !userId || !amountTotal) {
      return NextResponse.json(
        { error: "Missing metadata" },
        { status: 400 }
      );
    }

    // Idempotency: check if we already processed this session
    const existingTx = await db.query.walletTransactions.findFirst({
      where: (t, { eq: e }) => e(t.referenceId, session.id),
    });

    if (existingTx) {
      return NextResponse.json({ received: true, duplicate: true });
    }

    // Update stripe customer ID if not set
    if (session.customer) {
      await db
        .update(wallets)
        .set({
          stripeCustomerId:
            typeof session.customer === "string"
              ? session.customer
              : session.customer.id,
        })
        .where(eq(wallets.id, walletId));
    }

    // Credit the wallet
    await creditWallet(
      walletId,
      amountTotal,
      "Wallet funded via Stripe",
      session.id
    );

    await createAuditLog({
      actorType: "user",
      actorId: userId,
      action: "wallet.funded",
      resourceType: "wallet",
      resourceId: walletId,
      metadata: {
        amount_cents: amountTotal,
        stripe_session_id: session.id,
      },
    });
  }

  return NextResponse.json({ received: true });
}
