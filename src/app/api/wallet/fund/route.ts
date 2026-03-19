import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/clerk";
import { getOrCreateWallet } from "@/lib/wallet/ledger";
import { createFundingSession } from "@/lib/wallet/stripe";
import { fundWalletSchema } from "@/lib/validations";

// POST /api/wallet/fund — Create a Stripe Checkout session to fund wallet
export async function POST(req: Request) {
  try {
    const user = await requireAuth();
    const body = await req.json();
    const parsed = fundWalletSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const wallet = await getOrCreateWallet(user.id);

    const session = await createFundingSession(
      parsed.data.amount_cents,
      user.id,
      wallet.id,
      wallet.stripeCustomerId
    );

    return NextResponse.json({ checkout_url: session.url });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
