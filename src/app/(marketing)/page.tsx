import Link from "next/link";
import { Button } from "@/components/ui/button";

const features = [
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
];

const steps = [
  {
    step: "1",
    title: "Register an Agent",
    desc: "Create an agent identity with a name, description, and unique ID. Manage its full lifecycle from active to archived.",
  },
  {
    step: "2",
    title: "Configure Access",
    desc: "Generate API keys, grant scoped permissions, and set spending policies with per-transaction limits and daily caps.",
  },
  {
    step: "3",
    title: "Fund the Wallet",
    desc: "Add credits via Stripe checkout. Your agents draw from a shared wallet with full transaction history and audit trail.",
  },
  {
    step: "4",
    title: "Execute Actions",
    desc: "Agents call the gateway API with their key. Ripe enforces auth, permissions, spend policy, and records everything.",
  },
];

const pricing = [
  {
    action: "tools:echo",
    permission: "tools:execute",
    cost: "Free",
    desc: "Echo test — returns whatever you send",
  },
  {
    action: "tools:mock_api",
    permission: "tools:execute",
    cost: "$0.10",
    desc: "Simulated outbound API call",
  },
  {
    action: "payments:create",
    permission: "payments:create",
    cost: "amount_cents",
    desc: "Create a payment — cost equals the payment amount",
  },
];

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Nav */}
      <header className="border-b border-[var(--border)] sticky top-0 bg-[var(--background)] z-10">
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

      <main className="flex-1">
        {/* Hero */}
        <section className="flex flex-col items-center justify-center px-6 py-24 sm:py-32">
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
                <Button size="lg" className="px-8">
                  Start Building
                </Button>
              </Link>
              <Link href="/sign-in">
                <Button variant="outline" size="lg">
                  Dashboard
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="border-t border-[var(--border)] bg-[var(--muted)] py-20 px-6">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-2xl font-bold text-center mb-12">
              Everything agents need to operate safely
            </h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {features.map((f) => (
                <div
                  key={f.title}
                  className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-6"
                >
                  <h3 className="font-semibold">{f.title}</h3>
                  <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                    {f.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="py-20 px-6">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-2xl font-bold text-center mb-12">
              How it works
            </h2>
            <div className="space-y-8">
              {steps.map((s) => (
                <div key={s.step} className="flex gap-5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--muted)] text-sm font-bold">
                    {s.step}
                  </div>
                  <div>
                    <h3 className="font-semibold">{s.title}</h3>
                    <p className="text-sm text-[var(--muted-foreground)] mt-1">
                      {s.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing / cost table */}
        <section className="border-t border-[var(--border)] bg-[var(--muted)] py-20 px-6">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-2xl font-bold text-center mb-4">
              Transparent pricing
            </h2>
            <p className="text-center text-[var(--muted-foreground)] mb-10">
              You only pay for what your agents use. Fund your wallet via Stripe and
              agents draw from it per action.
            </p>
            <div className="border border-[var(--border)] rounded-lg overflow-hidden bg-[var(--background)]">
              <table className="w-full text-sm">
                <thead className="bg-[var(--muted)]">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium">Action</th>
                    <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Permission</th>
                    <th className="text-left px-4 py-3 font-medium">Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {pricing.map((p) => (
                    <tr key={p.action}>
                      <td className="px-4 py-3">
                        <code className="text-xs bg-[var(--muted)] px-1.5 py-0.5 rounded">{p.action}</code>
                        <p className="text-xs text-[var(--muted-foreground)] mt-0.5">{p.desc}</p>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <code className="text-xs">{p.permission}</code>
                      </td>
                      <td className="px-4 py-3 font-medium">{p.cost}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 px-6 text-center">
          <div className="mx-auto max-w-2xl">
            <h2 className="text-3xl font-bold mb-4">
              Ready to give your agents an identity?
            </h2>
            <p className="text-[var(--muted-foreground)] mb-8">
              Sign up in seconds. Create your first agent and test the execution
              gateway — no credit card required to start.
            </p>
            <Link href="/sign-up">
              <Button size="lg" className="px-10">
                Get Started Free
              </Button>
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] bg-[var(--muted)]">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            <div>
              <h3 className="font-semibold text-sm mb-3">Product</h3>
              <ul className="space-y-2 text-sm text-[var(--muted-foreground)]">
                <li><Link href="/sign-up" className="hover:text-[var(--foreground)]">Get Started</Link></li>
                <li><Link href="/sign-in" className="hover:text-[var(--foreground)]">Dashboard</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-sm mb-3">Developers</h3>
              <ul className="space-y-2 text-sm text-[var(--muted-foreground)]">
                <li><span>API Reference</span></li>
                <li><span>Action Types</span></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-sm mb-3">Platform</h3>
              <ul className="space-y-2 text-sm text-[var(--muted-foreground)]">
                <li><span>Security</span></li>
                <li><span>Status</span></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-sm mb-3">Company</h3>
              <ul className="space-y-2 text-sm text-[var(--muted-foreground)]">
                <li><span>About</span></li>
                <li><span>Contact</span></li>
              </ul>
            </div>
          </div>
          <div className="mt-10 pt-6 border-t border-[var(--border)] text-center text-xs text-[var(--muted-foreground)]">
            Ripe — Agent Infrastructure Platform
          </div>
        </div>
      </footer>
    </div>
  );
}
