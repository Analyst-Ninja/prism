"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { PageHeader } from "@prism/ui/components/page-header";
import { EmptyState, ErrorState } from "@prism/ui/components/states";
import { StatusBadge } from "@prism/ui/components/status-badge";
import { Input } from "@prism/ui/ui/input";
import { Skeleton } from "@prism/ui/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@prism/ui/ui/table";
import { useCustomerSearch } from "@/lib/api";
import { errorMessage } from "@/lib/errors";

function useDebounced<T>(value: T, ms = 250) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export default function CustomersPage() {
  const [q, setQ] = useState("");
  const debounced = useDebounced(q.trim());
  const results = useCustomerSearch(debounced);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Customer 360"
        description="Find a customer to see their balances, activity and flags as they are right now."
      />
      <div className="relative max-w-xl">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name, email or 9-digit customer ID"
          aria-label="Search customers"
          className="h-11 pl-9"
          autoFocus
        />
      </div>

      {results.isError ? (
        <ErrorState message={errorMessage(results.error)} onRetry={() => results.refetch()} />
      ) : results.isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : (results.data ?? []).length === 0 ? (
        <EmptyState
          title={debounced ? `No customer matches “${debounced}”` : "No customers yet"}
          description={
            debounced
              ? "Check the spelling, or try the customer ID. Email and phone are masked in results but you can still search by email."
              : "Demo data comes from the dev seeder. Run make seed-redis to load sample customers."
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Customer ID</TableHead>
                <TableHead className="hidden md:table-cell">Email</TableHead>
                <TableHead className="hidden md:table-cell">Phone</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.data!.map((c) => (
                <TableRow key={c.customer_id} className="cursor-pointer">
                  <TableCell>
                    <Link href={`/customers/${c.customer_id}`} className="font-medium text-ink hover:text-cobalt after:absolute after:inset-0">
                      {c.first_name} {c.last_name}
                    </Link>
                  </TableCell>
                  <TableCell className="font-mono text-sm text-slate tnum">{c.customer_id}</TableCell>
                  <TableCell className="hidden text-slate md:table-cell">{c.email}</TableCell>
                  <TableCell className="hidden font-mono text-sm text-slate tnum md:table-cell">{c.phone}</TableCell>
                  <TableCell>
                    <StatusBadge status={c.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
