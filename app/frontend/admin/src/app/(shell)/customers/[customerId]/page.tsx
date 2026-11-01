"use client";

import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Info } from "lucide-react";
import Link from "next/link";
import { use, useEffect } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { CopyId } from "@prism/ui/components/copy-id";
import { CountUp } from "@prism/ui/components/count-up";
import { Flash } from "@prism/ui/components/flash";
import { Money } from "@prism/ui/components/money";
import { ErrorState } from "@prism/ui/components/states";
import { StatusBadge } from "@prism/ui/components/status-badge";
import { Alert, AlertDescription, AlertTitle } from "@prism/ui/ui/alert";
import { Badge } from "@prism/ui/ui/badge";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@prism/ui/ui/chart";
import { Skeleton } from "@prism/ui/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@prism/ui/ui/table";
import { formatAmount, formatDateTime, groupAccountNumber, timeAgo, titleCase } from "@prism/ui/lib/format";
import type { Customer360 } from "@prism/ui/lib/types";
import { ApiError } from "@prism/ui/lib/api-client";
import { useCustomer360, useFreshness } from "@/lib/api";
import { errorMessage } from "@/lib/errors";

const chartConfig = { amount: { label: "Amount", color: "var(--chart-1)" } } satisfies ChartConfig;

export default function Customer360Page({ params }: { params: Promise<{ customerId: string }> }) {
  const { customerId } = use(params);
  const qc = useQueryClient();
  const doc = useCustomer360(customerId);
  const fresh = useFreshness(customerId);

  // Live sync: when the cheap freshness poll reports a newer log position, reload the whole document.
  const loadedLsn = doc.data?.meta.source_lsn;
  const latestLsn = fresh.data?.source_lsn;
  useEffect(() => {
    if (loadedLsn !== undefined && latestLsn !== undefined && latestLsn !== loadedLsn) {
      qc.invalidateQueries({ queryKey: ["360", customerId] });
    }
  }, [latestLsn, loadedLsn, customerId, qc]);

  if (doc.isError) {
    const notFound = doc.error instanceof ApiError && doc.error.status === 404;
    return (
      <div className="space-y-4">
        <BackLink />
        <ErrorState
          title={notFound ? "Customer not found" : "Couldn't load this customer"}
          message={
            notFound
              ? `No live record for ${customerId}. Customers created in the customer app appear here once the CDC pipeline is running; until then only seeded demo customers exist.`
              : errorMessage(doc.error)
          }
          onRetry={notFound ? undefined : () => doc.refetch()}
        />
      </div>
    );
  }

  if (!doc.data) {
    return (
      <div className="space-y-6" aria-busy="true">
        <BackLink />
        <Skeleton className="h-16 w-96" />
        <Skeleton className="h-24 w-72" />
        <Skeleton className="h-56 w-full" />
      </div>
    );
  }
  return <Body d={doc.data} syncing={fresh.isError} lag={fresh.data?.lag_seconds} />;
}

function BackLink() {
  return (
    <Link href="/customers" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate hover:text-cobalt">
      <ArrowLeft className="size-4" /> All customers
    </Link>
  );
}

function Body({ d, syncing }: { d: Customer360; syncing: boolean; lag?: number }) {
  const p = d.profile;
  const flags = d.flags;
  const own = new Set(d.accounts.map((a) => a.account_number));
  const chart = [
    { name: "Deposits", amount: Number(d.activity.total_deposits) },
    { name: "Withdrawals", amount: Number(d.activity.total_withdrawals) },
    { name: "Transfers out", amount: Number(d.activity.total_transfers_out) },
    { name: "Transfers in", amount: Number(d.activity.total_transfers_in) },
  ];

  return (
    <div className="space-y-8">
      <BackLink />

      {d.degraded && (
        <Alert className="border-cobalt/40 bg-sky/60">
          <Info className="text-cobalt" />
          <AlertTitle>{d.notice ?? "Live view unavailable, showing lakehouse view"}</AlertTitle>
          <AlertDescription>
            Balances below come from the lakehouse snapshot and may be behind. Live updates resume automatically when Redis is back.
          </AlertDescription>
        </Alert>
      )}

      <section className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-[28px] leading-tight font-semibold text-ink">
              {p.first_name} {p.last_name}
            </h1>
            <StatusBadge status={p.status} />
            {flags.has_frozen_account && <StatusBadge status="frozen" label="Frozen account" />}
            {flags.dormant && <StatusBadge status="dormant" label="Dormant" />}
            {flags.has_no_accounts && <Badge variant="outline">No accounts</Badge>}
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate">
            <CopyId value={p.customer_id} label="Customer ID" className="-ml-1.5" />
            <span>{p.email}</span>
            <span className="font-mono tnum">{p.phone}</span>
          </div>
        </div>
        <SyncPill d={d} stale={syncing} />
      </section>

      <section className="space-y-2">
        <p className="text-sm font-medium text-ink">Total balance</p>
        <Flash watch={d.totals.total_balance}>
          <CountUp
            value={Number(d.totals.total_balance)}
            className="block font-display text-[48px] leading-none font-semibold tracking-tight text-ink tnum sm:text-[56px]"
          />
        </Flash>
        <p className="text-sm text-slate">
          <Flash watch={d.totals.account_count}>{d.totals.account_count} accounts</Flash> ·{" "}
          <Flash watch={d.activity.txn_count}>{d.activity.txn_count} transactions</Flash> · last activity{" "}
          {timeAgo(d.activity.last_txn_at)}
        </p>
      </section>

      <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr]">
        <section aria-labelledby="acc-h" className="space-y-3">
          <h2 id="acc-h" className="text-xl font-semibold text-ink">
            Accounts
          </h2>
          {d.accounts.length === 0 ? (
            <p className="rounded-xl border border-dashed border-input p-6 text-sm text-slate">
              This customer has no accounts{flags.kyc_pending ? " yet. KYC is still pending." : "."}
            </p>
          ) : (
            <div className="overflow-hidden rounded-xl border border-border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden sm:table-cell">Opened</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {d.accounts.map((a) => (
                    <TableRow key={a.account_number}>
                      <TableCell>
                        <span className="block font-medium text-ink">{titleCase(a.type)}</span>
                        <span className="block font-mono text-xs text-slate tnum">{groupAccountNumber(a.account_number)}</span>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={a.status} />
                      </TableCell>
                      <TableCell className="hidden text-slate sm:table-cell">{timeAgo(a.opened_at)}</TableCell>
                      <TableCell className="text-right font-medium">
                        <Flash watch={a.balance}>
                          <Money value={a.balance} />
                        </Flash>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </section>

        <section aria-labelledby="recent-h" className="space-y-3">
          <h2 id="recent-h" className="text-xl font-semibold text-ink">
            Recent transactions
          </h2>
          <div className="rounded-xl border border-border bg-card px-4">
            {d.recent_transactions.length === 0 ? (
              <p className="py-8 text-sm text-slate">No transactions yet.</p>
            ) : (
              <ul className="divide-y divide-border">
                {d.recent_transactions.map((t) => {
                  const incoming = t.type === "deposit" || (t.type === "transfer" && !own.has(t.account_number));
                  const internal = t.type === "transfer" && own.has(t.account_number) && own.has(t.counterparty_account_number ?? "");
                  return (
                    <li key={t.id} className="flex items-center gap-3 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-ink">{titleCase(t.type)}</p>
                        <p className="truncate text-xs text-slate">
                          …{t.account_number.slice(-4)}
                          {t.counterparty_account_number ? ` → …${t.counterparty_account_number.slice(-4)}` : ""} ·{" "}
                          {formatDateTime(t.created_at)}
                        </p>
                      </div>
                      <Money
                        value={t.amount}
                        signed={internal ? undefined : incoming ? "in" : "out"}
                        className="text-sm font-medium text-ink"
                      />
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>
      </div>

      <section aria-labelledby="act-h" className="space-y-3">
        <h2 id="act-h" className="text-xl font-semibold text-ink">
          Lifetime activity
        </h2>
        <div className="rounded-xl border border-border bg-card p-4 sm:p-6">
          {d.activity.txn_count === 0 ? (
            <p className="py-6 text-sm text-slate">No activity yet. Totals will appear here after the first transaction.</p>
          ) : (
          <ChartContainer config={chartConfig} className="h-56 w-full">
            <BarChart data={chart} margin={{ left: 8, right: 8 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="name" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} width={64} tickFormatter={(v) => formatAmount(v).replace(/\.00$/, "")} />
              <ChartTooltip content={<ChartTooltipContent formatter={(v) => <span className="tnum">{formatAmount(Number(v))}</span>} />} />
              <Bar dataKey="amount" fill="var(--color-amount)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
          )}
        </div>
      </section>
    </div>
  );
}

function SyncPill({ d, stale }: { d: Customer360; stale: boolean }) {
  const live = d.source === "redis" && !stale;
  return (
    <div
      className="inline-flex items-center gap-2 self-start rounded-full border border-border bg-card px-3 py-1.5 text-sm"
      role="status"
      aria-live="polite"
    >
      <span className="relative flex size-2.5">
        {live && <span className="absolute inline-flex size-full animate-ping rounded-full bg-ok opacity-60" />}
        <span className={`relative inline-flex size-2.5 rounded-full ${live ? "bg-ok" : "bg-warn"}`} />
      </span>
      <span className="font-medium text-ink">{live ? "Live" : d.degraded ? "Lakehouse snapshot" : "Reconnecting"}</span>
      <span className="text-slate">· last change {timeAgo(d.meta.last_updated_at)}</span>
    </div>
  );
}
