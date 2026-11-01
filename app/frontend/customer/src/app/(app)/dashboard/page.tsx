"use client";

import { ArrowLeftRight, Plus } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { CountUp } from "@prism/ui/components/count-up";
import { EmptyState, ErrorState } from "@prism/ui/components/states";
import { Money } from "@prism/ui/components/money";
import { StatusBadge } from "@prism/ui/components/status-badge";
import { Alert, AlertDescription, AlertTitle } from "@prism/ui/ui/alert";
import { Button } from "@prism/ui/ui/button";
import { Skeleton } from "@prism/ui/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@prism/ui/ui/table";
import { groupAccountNumber, titleCase } from "@prism/ui/lib/format";
import { AccountDialogHost, type DialogAction } from "@/components/account-dialog-host";
import { AccountMenu } from "@/components/account-menu";
import { ActivityList } from "@/components/activity-list";
import { actions, useAccounts, useApiMutation, useCustomer, useRecentActivity } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { useSession } from "@/lib/session";

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

export default function DashboardPage() {
  const customerId = useSession()!;
  const customer = useCustomer(customerId);
  const accounts = useAccounts(customerId);
  const [action, setAction] = useState<DialogAction>(null);
  const approve = useApiMutation(() => actions.approveKyc(customerId));

  const list = useMemo(() => accounts.data ?? [], [accounts.data]);
  const live = useMemo(() => list.filter((a) => a.status !== "closed"), [list]);
  const total = useMemo(() => live.reduce((sum, a) => sum + Number(a.balance), 0), [live]);
  const own = useMemo(() => new Set(list.map((a) => a.account_number)), [list]);
  const activity = useRecentActivity(list);
  const frozen = live.filter((a) => a.status === "frozen").length;
  const canTransact = customer.data?.status === "active" && live.some((a) => a.status === "active");

  if (customer.isError) return <ErrorState message={errorMessage(customer.error)} onRetry={() => customer.refetch()} />;

  return (
    <div className="space-y-10">
      <section className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <p className="text-sm text-slate">
            {greeting()}
            {customer.data ? `, ${customer.data.first_name}` : ""}
          </p>
          <h1 className="sr-only">Dashboard</h1>
          <p className="text-sm font-medium text-ink">Total balance</p>
          {accounts.isLoading ? (
            <Skeleton className="h-14 w-72" />
          ) : (
            <CountUp value={total} className="block font-display text-[48px] leading-none font-semibold tracking-tight text-ink tnum sm:text-[56px]" />
          )}
          <p className="text-sm text-slate">
            {live.length} {live.length === 1 ? "account" : "accounts"}
            {frozen > 0 && ` · ${frozen} frozen`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="lg" variant={live.length === 0 ? "outline" : "default"} disabled={!canTransact} onClick={() => setAction({ kind: "deposit" })}>
            <Plus /> Deposit
          </Button>
          <Button size="lg" variant="outline" disabled={!canTransact} onClick={() => setAction({ kind: "transfer" })}>
            <ArrowLeftRight /> Transfer
          </Button>
          <Button
            size="lg"
            variant={live.length === 0 ? "default" : "outline"}
            disabled={customer.data?.status !== "active"}
            onClick={() => setAction({ kind: "open" })}
          >
            Open account
          </Button>
        </div>
      </section>

      {customer.data?.status === "kyc_pending" && (
        <Alert>
          <AlertTitle>Your KYC is pending</AlertTitle>
          <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span>You can open accounts once it&apos;s approved. In this demo you can approve it yourself.</span>
            <Button
              size="sm"
              disabled={approve.isPending}
              onClick={() =>
                approve.mutate(undefined, {
                  onSuccess: () => toast.success("KYC approved"),
                  onError: (e) => toast.error(errorMessage(e)),
                })
              }
            >
              {approve.isPending ? "Approving…" : "Approve KYC"}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-8 lg:grid-cols-[1.6fr_1fr]">
        <section aria-labelledby="accounts-h" className="space-y-3">
          <h2 id="accounts-h" className="text-xl font-semibold text-ink">
            Accounts
          </h2>
          {accounts.isError ? (
            <ErrorState message={errorMessage(accounts.error)} onRetry={() => accounts.refetch()} />
          ) : accounts.isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : list.length === 0 ? (
            <EmptyState
              title="No accounts yet"
              description={
                customer.data?.status === "active"
                  ? "Open a savings or current account to start moving money."
                  : "Approve your KYC first, then open your first account."
              }
              action={
                customer.data?.status === "active" ? (
                  <Button onClick={() => setAction({ kind: "open" })}>Open account</Button>
                ) : undefined
              }
            />
          ) : (
            <div className="overflow-hidden rounded-xl border border-border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead className="w-12">
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {list.map((a) => (
                    <TableRow key={a.account_number}>
                      <TableCell>
                        <Link href={`/accounts/${a.account_number}`} className="group block">
                          <span className="block font-medium text-ink group-hover:text-cobalt">{titleCase(a.type)}</span>
                          <span className="block font-mono text-xs text-slate tnum">{groupAccountNumber(a.account_number)}</span>
                        </Link>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={a.status} />
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        <Money value={a.balance} />
                      </TableCell>
                      <TableCell>
                        <AccountMenu account={a} onAction={setAction} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </section>

        <section aria-labelledby="activity-h" className="space-y-3">
          <h2 id="activity-h" className="text-xl font-semibold text-ink">
            Recent activity
          </h2>
          <div className="rounded-xl border border-border bg-card px-4">
            {activity.loading ? (
              <div className="space-y-3 py-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : activity.items.length === 0 ? (
              <p className="py-8 text-sm text-slate">Nothing yet. Make a deposit and it will show up here.</p>
            ) : (
              <ActivityList items={activity.items} own={own} />
            )}
          </div>
        </section>
      </div>

      <AccountDialogHost action={action} onClose={() => setAction(null)} accounts={list} customerId={customerId} />
    </div>
  );
}
