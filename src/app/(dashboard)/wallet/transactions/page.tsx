"use client";

import { useState, useEffect, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Transaction {
  id: string;
  type: string;
  amount: number;
  balanceAfter: number;
  description: string | null;
  referenceId: string | null;
  status: string;
  agentId: string | null;
  createdAt: string;
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const limit = 50;

  const fetchTransactions = useCallback(async (off: number) => {
    const res = await fetch(`/api/wallet?limit=${limit}&offset=${off}`);
    const data = await res.json();
    const txs = data.transactions ?? [];
    if (off === 0) {
      setTransactions(txs);
    } else {
      setTransactions((prev) => [...prev, ...txs]);
    }
    setHasMore(txs.length === limit);
  }, []);

  useEffect(() => {
    fetchTransactions(0);
  }, [fetchTransactions]);

  const formatCents = (cents: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(cents / 100);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Transaction History</h1>

      <Card>
        <CardHeader>
          <CardTitle>All Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="text-sm text-[var(--muted-foreground)]">
              No transactions yet.
            </p>
          ) : (
            <>
              <div className="border border-[var(--border)] rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-[var(--muted)]">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium">Type</th>
                      <th className="text-left px-4 py-3 font-medium">
                        Amount
                      </th>
                      <th className="text-left px-4 py-3 font-medium">
                        Balance After
                      </th>
                      <th className="text-left px-4 py-3 font-medium">
                        Description
                      </th>
                      <th className="text-left px-4 py-3 font-medium">
                        Status
                      </th>
                      <th className="text-left px-4 py-3 font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {transactions.map((tx) => (
                      <tr key={tx.id}>
                        <td className="px-4 py-3">
                          <Badge variant="outline">{tx.type}</Badge>
                        </td>
                        <td
                          className={`px-4 py-3 font-medium ${
                            tx.type === "credit"
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {tx.type === "credit" ? "+" : "-"}
                          {formatCents(tx.amount)}
                        </td>
                        <td className="px-4 py-3">{formatCents(tx.balanceAfter)}</td>
                        <td className="px-4 py-3 text-[var(--muted-foreground)]">
                          {tx.description ?? "—"}
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant={
                              tx.status === "completed"
                                ? "success"
                                : tx.status === "failed"
                                  ? "destructive"
                                  : "warning"
                            }
                          >
                            {tx.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-[var(--muted-foreground)]">
                          {new Date(tx.createdAt).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {hasMore && (
                <div className="mt-4 text-center">
                  <Button
                    variant="outline"
                    onClick={() => {
                      const newOffset = offset + limit;
                      setOffset(newOffset);
                      fetchTransactions(newOffset);
                    }}
                  >
                    Load More
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
