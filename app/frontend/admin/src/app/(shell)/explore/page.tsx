"use client";

import { ChevronLeft, ChevronRight, FilterX } from "lucide-react";
import { useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Money } from "@prism/ui/components/money";
import { PageHeader } from "@prism/ui/components/page-header";
import { EmptyState, ErrorState } from "@prism/ui/components/states";
import { StatusBadge } from "@prism/ui/components/status-badge";
import { Button } from "@prism/ui/ui/button";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@prism/ui/ui/chart";
import { Input } from "@prism/ui/ui/input";
import { Label } from "@prism/ui/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@prism/ui/ui/select";
import { Skeleton } from "@prism/ui/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@prism/ui/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@prism/ui/ui/tabs";
import { formatAmount, formatDateTime, groupAccountNumber, titleCase } from "@prism/ui/lib/format";
import { useExploreSummary, useExploreTransactions, type ExploreFilterValues } from "@/lib/api";
import { errorMessage } from "@/lib/errors";

const PAGE = 15;
const ANY = "any";
const GROUPS = [
  { value: "txn_type", label: "Transaction type" },
  { value: "account_type", label: "Account type" },
  { value: "month", label: "Month" },
  { value: "status", label: "Status" },
];
const chartConfig = {
  total_amount: { label: "Total amount", color: "var(--chart-1)" },
} satisfies ChartConfig;

function FilterSelect({
  id,
  label,
  value,
  onChange,
  options,
}: {
  id: string;
  label: string;
  value: string | undefined;
  onChange: (v: string | undefined) => void;
  options: string[];
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Select value={value ?? ANY} onValueChange={(v) => onChange(v === ANY ? undefined : v)}>
        <SelectTrigger id={id} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ANY}>Any</SelectItem>
          {options.map((o) => (
            <SelectItem key={o} value={o}>
              {titleCase(o)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export default function ExplorePage() {
  const [filters, setFilters] = useState<ExploreFilterValues>({});
  const [groupBy, setGroupBy] = useState("txn_type");
  const [page, setPage] = useState(0);
  const summary = useExploreSummary(filters, groupBy);
  const txns = useExploreTransactions(filters, PAGE, page * PAGE);

  const set = (patch: Partial<ExploreFilterValues>) => {
    setFilters((f) => ({ ...f, ...patch }));
    setPage(0);
  };
  const hasFilters = Object.values(filters).some(Boolean);
  const rows = summary.data ?? [];
  const chart = rows.map((r) => ({ group: r.group, total_amount: Number(r.total_amount) }));

  return (
    <div className="space-y-8">
      <PageHeader
        title="Explore"
        description="Slice transaction history from the lakehouse. Totals and averages cover every transaction that matches your filters."
      />

      <section aria-label="Filters" className="rounded-xl border border-border bg-card p-4 sm:p-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="space-y-1.5">
            <Label htmlFor="f-from">From date</Label>
            <Input id="f-from" type="date" value={filters.date_from ?? ""} onChange={(e) => set({ date_from: e.target.value || undefined })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="f-to">To date</Label>
            <Input id="f-to" type="date" value={filters.date_to ?? ""} onChange={(e) => set({ date_to: e.target.value || undefined })} />
          </div>
          <FilterSelect id="f-acct" label="Account type" value={filters.account_type} onChange={(v) => set({ account_type: v })} options={["savings", "current"]} />
          <FilterSelect id="f-type" label="Transaction type" value={filters.txn_type} onChange={(v) => set({ txn_type: v })} options={["deposit", "withdrawal", "transfer"]} />
          <FilterSelect id="f-status" label="Status" value={filters.status} onChange={(v) => set({ status: v })} options={["completed", "failed", "reversed"]} />
        </div>
        {hasFilters && (
          <Button variant="ghost" size="sm" className="mt-3" onClick={() => set({ date_from: undefined, date_to: undefined, account_type: undefined, txn_type: undefined, status: undefined })}>
            <FilterX /> Clear filters
          </Button>
        )}
      </section>

      <section aria-labelledby="sum-h" className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 id="sum-h" className="text-xl font-semibold text-ink">
            Summary by {GROUPS.find((g) => g.value === groupBy)?.label.toLowerCase()}
          </h2>
          <Tabs value={groupBy} onValueChange={setGroupBy}>
            <TabsList>
              {GROUPS.map((g) => (
                <TabsTrigger key={g.value} value={g.value}>
                  {g.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
        {summary.isError ? (
          <ErrorState message={errorMessage(summary.error)} onRetry={() => summary.refetch()} />
        ) : summary.isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : rows.length === 0 ? (
          <EmptyState title="Nothing matches these filters" description="Widen the date range or clear a filter." />
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
            <div className="overflow-hidden rounded-xl border border-border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{GROUPS.find((g) => g.value === groupBy)?.label}</TableHead>
                    <TableHead className="text-right">Count</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Average</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.group}>
                      <TableCell className="font-medium text-ink">{groupBy === "month" ? r.group : titleCase(r.group)}</TableCell>
                      <TableCell className="text-right tnum">{r.count}</TableCell>
                      <TableCell className="text-right"><Money value={r.total_amount} /></TableCell>
                      <TableCell className="text-right"><Money value={r.avg_amount} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <ChartContainer config={chartConfig} className="h-64 w-full">
                <BarChart data={chart} margin={{ left: 8, right: 8 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="group" tickLine={false} axisLine={false} tickFormatter={(v) => (groupBy === "month" ? v : titleCase(String(v)))} />
                  <YAxis tickLine={false} axisLine={false} width={64} tickFormatter={(v) => formatAmount(v).replace(/\.00$/, "")} />
                  <ChartTooltip content={<ChartTooltipContent formatter={(v) => <span className="tnum">{formatAmount(Number(v))}</span>} />} />
                  <Bar dataKey="total_amount" fill="var(--color-total_amount)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </div>
          </div>
        )}
      </section>

      <section aria-labelledby="tx-h" className="space-y-3">
        <h2 id="tx-h" className="text-xl font-semibold text-ink">
          Transactions
        </h2>
        {txns.isError ? (
          <ErrorState message={errorMessage(txns.error)} onRetry={() => txns.refetch()} />
        ) : txns.isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : (txns.data ?? []).length === 0 ? (
          <EmptyState title="No transactions on this page" description="Go back a page or change the filters." />
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="hidden md:table-cell">Account</TableHead>
                  <TableHead className="hidden lg:table-cell">Customer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {txns.data!.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="whitespace-nowrap text-slate">{formatDateTime(t.created_at)}</TableCell>
                    <TableCell className="font-medium text-ink">{titleCase(t.type)}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      <span className="block font-mono text-xs tnum text-slate">{groupAccountNumber(t.account_number)}</span>
                      <span className="text-xs text-slate">{titleCase(t.account_type)}</span>
                    </TableCell>
                    <TableCell className="hidden font-mono text-xs tnum text-slate lg:table-cell">{t.customer_id}</TableCell>
                    <TableCell><StatusBadge status={t.status} /></TableCell>
                    <TableCell className="text-right font-medium"><Money value={t.amount} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="flex items-center justify-between border-t border-border px-4 py-3">
              <span className="text-sm text-slate">Page {page + 1}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                  <ChevronLeft /> Previous
                </Button>
                <Button variant="outline" size="sm" disabled={(txns.data?.length ?? 0) < PAGE} onClick={() => setPage((p) => p + 1)}>
                  Next <ChevronRight />
                </Button>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
