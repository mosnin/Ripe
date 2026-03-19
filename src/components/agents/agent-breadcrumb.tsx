"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";

export function AgentBreadcrumb({
  agentId,
  agentName,
  currentPage,
}: {
  agentId: string;
  agentName?: string;
  currentPage: string;
}) {
  return (
    <nav className="flex items-center gap-1.5 text-sm text-[var(--muted-foreground)] mb-4">
      <Link href="/agents" className="hover:text-[var(--foreground)] transition-colors">
        Agents
      </Link>
      <ChevronRight className="h-3.5 w-3.5" />
      <Link href={`/agents/${agentId}`} className="hover:text-[var(--foreground)] transition-colors">
        {agentName ?? "Agent"}
      </Link>
      <ChevronRight className="h-3.5 w-3.5" />
      <span className="text-[var(--foreground)] font-medium">{currentPage}</span>
    </nav>
  );
}
