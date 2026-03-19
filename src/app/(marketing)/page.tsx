import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Nav */}
      <header className="border-b border-[var(--border)]">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <span className="text-xl font-bold tracking-tight">Ripe</span>
          <div className="flex items-center gap-4">
            <Link href="/sign-in">
              <Button variant="ghost" size="sm">
                Sign In
              </Button>
            </Link>
            <Link href="/sign-up">
              <Button size="sm">Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="flex flex-1 flex-col items-center justify-center px-6">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">
            Identity + Wallet
            <br />
            <span className="text-[var(--muted-foreground)]">for AI Agents</span>
          </h1>
          <p className="mt-6 text-lg text-[var(--muted-foreground)] max-w-2xl mx-auto">
            Give your agents safe identity, scoped permissions, and controlled
            economic action. The infrastructure layer for the agent economy.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Link href="/sign-up">
              <Button size="lg">Start Building</Button>
            </Link>
            <Link href="/sign-in">
              <Button variant="outline" size="lg">
                Dashboard
              </Button>
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="mx-auto mt-24 grid max-w-4xl grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              title: "Identity",
              desc: "Unique agent IDs with API key authentication and lifecycle management.",
            },
            {
              title: "Permissions",
              desc: "Capability-based scopes with optional constraints per agent.",
            },
            {
              title: "Wallet",
              desc: "Internal ledger with Stripe-funded balances and transaction history.",
            },
            {
              title: "Execution",
              desc: "Controlled gateway that enforces auth, permissions, and spend policy.",
            },
          ].map((f) => (
            <div
              key={f.title}
              className="rounded-lg border border-[var(--border)] p-6"
            >
              <h3 className="font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] py-8 text-center text-sm text-[var(--muted-foreground)]">
        Ripe — Agent Infrastructure Platform
      </footer>
    </div>
  );
}
