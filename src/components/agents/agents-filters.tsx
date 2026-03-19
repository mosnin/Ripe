"use client";

import { useRouter, usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";

export function AgentsFilters({
  currentQuery,
  currentStatus,
}: {
  currentQuery: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState(currentQuery);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    setQuery(currentQuery);
  }, [currentQuery]);

  function navigate(q: string, status: string) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (status && status !== "all") params.set("status", status);
    const qs = params.toString();
    router.push(`${pathname}${qs ? `?${qs}` : ""}`);
  }

  function handleSearch(value: string) {
    setQuery(value);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      navigate(value, currentStatus);
    }, 300);
  }

  function handleStatusChange(status: string) {
    navigate(query, status);
  }

  return (
    <div className="flex gap-3 mb-4 flex-col sm:flex-row">
      <div className="flex-1">
        <Input
          placeholder="Search agents..."
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
        />
      </div>
      <select
        value={currentStatus}
        onChange={(e) => handleStatusChange(e.target.value)}
        className="flex h-10 rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm sm:w-40"
      >
        <option value="all">All statuses</option>
        <option value="active">Active</option>
        <option value="suspended">Suspended</option>
        <option value="archived">Archived</option>
      </select>
    </div>
  );
}
