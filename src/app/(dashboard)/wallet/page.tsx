"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

interface Wallet {
  id: string;
  balance: number;
  currency: string;
  status: string;
}

interface Transaction {
  id: string;
  type: string;
  amount: number;
  balanceAfter: number;
  description: string | null;
  status: string;
  createdAt: string;
}

export default function WalletPage() {
  const searchParams = useSearchParams();
  const funded = searchParams.get("funded");
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [fundAmount, setFundAmount] = useState("");
  const [banner, setBanner] = useState<{ type: "success" | "cancel"; message: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchWallet = useCallback(async () => {
    const res = await fetch("/api/wallet");
    const data = await res.json();
    setWallet(data.wallet);
    setTransactions(data.transactions ?? []);
  }, []);

  useEffect(() => {
    fetchWallet();
  }, [fetchWallet]);

  useEffect(() => {
    if (funded === "true") {
      setBanner({
        type: "success",
        message: "Payment successful! Your wallet balance has been updated.",
      });
      // Clean URL without reload
      window.history.replaceState(null, "", "/wallet");
    } else if (funded === "false") {
      setBanner({
        type: "cancel",
        message: "Payment was cancelled. No funds were added.",
      });
      window.history.replaceState(null, "", "/wallet");
    }
  }, [funded]);

  async function fundWallet() {
    const cents = Math.round(parseFloat(fundAmount) * 100);
    if (!cents || cents < 100) return;

    setLoading(true);
    try {
      const res = await fetch("/api/wallet/fund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount_cents: cents }),
      });
      const data = await res.json();
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      }
    } finally {
      setLoading(false);
    }
  }

  const formatCents = (cents: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(cents / 100);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Wallet</h1>

      {banner && (
        <div
          className={`mb-4 rounded-md border p-3 text-sm flex items-center justify-between ${
            banner.type === "success"
              ? "border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200"
              : "border-yellow-200 bg-yellow-50 text-yellow-800 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-200"
          }`}
        >
          <span>{banner.message}</span>
          <button
            onClick={() => setBanner(null)}
            className="ml-3 text-xs opacity-60 hover:opacity-100"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Balance */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Balance</CardTitle>
          <CardDescription>Platform credits for agent operations</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-4xl font-bold">
            {wallet ? formatCents(wallet.balance) : "Loading..."}
          </p>
          {wallet && (
            <Badge
              variant={wallet.status === "active" ? "success" : "destructive"}
              className="mt-2"
            >
              {wallet.status}
            </Badge>
          )}
        </CardContent>
      </Card>

      {/* Fund */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Add Funds</CardTitle>
          <CardDescription>
            Fund your wallet via Stripe. Minimum $1.00.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 items-end max-w-sm">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">
                Amount (USD)
              </label>
              <Input
                type="number"
                min="1"
                step="0.01"
                value={fundAmount}
                onChange={(e) => setFundAmount(e.target.value)}
                placeholder="10.00"
              />
            </div>
            <Button onClick={fundWallet} disabled={loading || !fundAmount}>
              {loading ? "Redirecting..." : "Fund Wallet"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent transactions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Recent Transactions</CardTitle>
            <Link href="/wallet/transactions">
              <Button variant="ghost" size="sm">
                View all
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="text-sm text-[var(--muted-foreground)]">
              No transactions yet.
            </p>
          ) : (
            <div className="space-y-2">
              {transactions.slice(0, 10).map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between rounded-md border border-[var(--border)] p-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-sm font-medium ${
                          tx.type === "credit"
                            ? "text-green-600 dark:text-green-400"
                            : "text-red-600 dark:text-red-400"
                        }`}
                      >
                        {tx.type === "credit" ? "+" : "-"}
                        {formatCents(tx.amount)}
                      </span>
                      <Badge variant="outline">{tx.type}</Badge>
                    </div>
                    <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                      {tx.description ?? "—"} •{" "}
                      {new Date(tx.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <span className="text-sm text-[var(--muted-foreground)]">
                    {formatCents(tx.balanceAfter)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
