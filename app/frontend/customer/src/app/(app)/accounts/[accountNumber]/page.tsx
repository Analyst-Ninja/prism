"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useState } from "react";
import { CopyId } from "@prism/ui/components/copy-id";
import { CountUp } from "@prism/ui/components/count-up";
import { Money } from "@prism/ui/components/money";
import { EmptyState, ErrorState } from "@prism/ui/components/states";
import { StatusBadge } from "@prism/ui/components/status-badge";
import { Button } from "@prism/ui/ui/button";
import { Skeleton } from "@prism/ui/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@prism/ui/ui/table";
import { formatDateTime, groupAccountNumber, titleCase } from "@prism/ui/lib/format";
import { AccountDialogHost, type DialogAction } from "@/components/account-dialog-host";
import { useAccount, useAccountTransactions, useAccounts } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { useSession } from "@/lib/session";
import { describeTxn } from "@/lib/txn";

export default function AccountPage({ params }: { params: Promise<{ accountNumber: string }> }) {
  const { accountNumber } = use(params);
  const customerId = useSession()!;
  const router = useRouter();
  const account = useAccount(accountNumber);
  const txns = useAccountTransactions(accountNumber);
  const all = useAccounts(customerId);
  const [action, setAction] = useState<DialogAction>(null);

  if (account.isError) {
    return (
      <div className="space-y-4">
        <BackLink />
        <ErrorState
          title="Account not found"
          message={errorMessage(account.error)}
          onRetry={() => account.refetch()}
        />
      </div>
    );
  }

  const a = account.data;
  const own = new Set([accountNumber]);
  const mine = a && a.customer_id === customerId;
  const active = a?.status === "active";

  return (
    <div className="space-y-8">
      <BackLink />
      {!a ? (
        <Skeleton className="h-28 w-full" />
      ) : !mine ? (
        <ErrorState title="This isn't your account" message="Sign in with the customer that owns this account to see it." />
      ) : (
        <>
          <section className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-[28px] leading-tight font-semibold text-ink">{titleCase(a.type)} account</h1>
                <StatusBadge status={a.status} />
              </div>
              <CopyId value={a.account_number} label="Account number" className="-ml-1.5" />
              <div className="pt-3">
                <p className="text-sm font-medium text-ink">Balance</p>
                <CountUp value={Number(a.balance)} className="block font-display text-[40px] leading-none font-semibold tracking-tight text-ink tnum" />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button disabled={!active} onClick={() => setAction({ kind: "deposit", account: a })}>
                Deposit
              </Button>
              <Button variant="outline" disabled={!active} onClick={() => setAction({ kind: "withdraw", account: a })}>
                Withdraw
              </Button>
              <Button variant="outline" disabled={!active} onClick={() => setAction({ kind: "transfer", account: a })}>
                Transfer
              </Button>
              {a.status === "frozen" ? (
                <Button variant="outline" onClick={() => setAction({ kind: "unfreeze", account: a })}>
                  Unfreeze
                </Button>
              ) : (
                <Button variant="outline" disabled={a.status === "closed"} onClick={() => setAction({ kind: "freeze", account: a })}>
                  Freeze
                </Button>
              )}
              <Button
                variant="outline"
                className="text-destructive"
                disabled={a.status === "closed" || Number(a.balance) !== 0}
                title={Number(a.balance) !== 0 ? "Withdraw or transfer the remaining balance first" : undefined}
                onClick={() => setAction({ kind: "close", account: a })}
              >
                Close account
              </Button>
            </div>
          </section>

          <section aria-labelledby="hist-h" className="space-y-3">
            <h2 id="hist-h" className="text-xl font-semibold text-ink">
              Transaction history
            </h2>
            {txns.isError ? (
              <ErrorState message={errorMessage(txns.error)} onRetry={() => txns.refetch()} />
            ) : txns.isLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : (txns.data ?? []).length === 0 ? (
              <EmptyState title="No transactions yet" description="Deposits, withdrawals and transfers on this account will be listed here." />
            ) : (
              <div className="overflow-hidden rounded-xl border border-border bg-card">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {txns.data!.map((t) => {
                      const d = describeTxn(t, own);
                      const counter =
                        t.type === "transfer"
                          ? groupAccountNumber(d.direction === "out" ? (t.counterparty_account_number ?? "") : t.account_number)
                          : null;
                      return (
                        <TableRow key={t.id}>
                          <TableCell className="whitespace-nowrap text-slate">{formatDateTime(t.created_at)}</TableCell>
                          <TableCell>
                            <span className="block font-medium text-ink">{d.label}</span>
                            {counter && (
                              <span className="block font-mono text-xs text-slate tnum">
                                {d.direction === "out" ? "To" : "From"} {counter}
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={t.status} />
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            <Money value={t.amount} signed={d.direction === "neutral" ? undefined : d.direction} />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </section>
        </>
      )}
      <AccountDialogHost
        action={action}
        onClose={() => setAction(null)}
        accounts={all.data ?? (a ? [a] : [])}
        customerId={customerId}
        afterClose={() => router.replace("/dashboard")}
      />
    </div>
  );
}

function BackLink() {
  return (
    <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate hover:text-cobalt">
      <ArrowLeft className="size-4" /> Dashboard
    </Link>
  );
}
