import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/clerk";
import { getOrCreateWallet, getTransactions } from "@/lib/wallet/ledger";

// GET /api/wallet — Get wallet balance and recent transactions
export async function GET(req: Request) {
  try {
    const user = await requireAuth();
    const wallet = await getOrCreateWallet(user.id);

    const url = new URL(req.url);
    const limit = Math.min(Number(url.searchParams.get("limit") ?? 50), 100);
    const offset = Number(url.searchParams.get("offset") ?? 0);

    const transactions = await getTransactions(wallet.id, limit, offset);

    return NextResponse.json({
      wallet: {
        id: wallet.id,
        balance: wallet.balance,
        currency: wallet.currency,
        status: wallet.status,
      },
      transactions,
    });
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
