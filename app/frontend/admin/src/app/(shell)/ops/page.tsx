"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CircleCheck, CircleX } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Money } from "@prism/ui/components/money";
import { PageHeader } from "@prism/ui/components/page-header";
import { ErrorState } from "@prism/ui/components/states";
import { Alert, AlertDescription, AlertTitle } from "@prism/ui/ui/alert";
import { Button } from "@prism/ui/ui/button";
import { Input } from "@prism/ui/ui/input";
import { Label } from "@prism/ui/ui/label";
import { Skeleton } from "@prism/ui/ui/skeleton";
import type { Consistency } from "@prism/ui/lib/types";
import { fetchConsistency, useOpsStatus } from "@/lib/api";
import { errorMessage } from "@/lib/errors";

const schema = z.object({ id: z.string().regex(/^\d{9}$/, "Enter the 9-digit customer ID") });

function Stat({ label, value, note }: { label: string; value: React.ReactNode; note?: string }) {
  return (
    <div className="space-y-1">
      <dt className="text-sm text-slate">{label}</dt>
      <dd className="font-display text-[28px] leading-none font-semibold text-ink tnum">{value}</dd>
      {note && <p className="text-xs text-slate">{note}</p>}
    </div>
  );
}

export default function OpsPage() {
  const status = useOpsStatus();
  const [result, setResult] = useState<Consistency | null>(null);
  const [error, setError] = useState<string | null>(null);
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { id: "" } });

  async function onSubmit({ id }: z.infer<typeof schema>) {
    setError(null);
    setResult(null);
    try {
      setResult(await fetchConsistency(id));
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  const s = status.data;
  return (
    <div className="max-w-3xl space-y-10">
      <PageHeader
        title="Ops status"
        description="Check that the live store and the lakehouse agree. Useful after restarting or rebuilding Redis."
      />

      <section aria-labelledby="sync-h" className="space-y-4">
        <h2 id="sync-h" className="text-xl font-semibold text-ink">
          Live store vs lakehouse
        </h2>
        {status.isError ? (
          <ErrorState message={errorMessage(status.error)} onRetry={() => status.refetch()} />
        ) : !s ? (
          <Skeleton className="h-32 w-full" />
        ) : (
          <div className="space-y-4 rounded-xl border border-border bg-card p-6">
            <div className="flex items-center gap-2 text-sm font-medium">
              {s.in_sync ? (
                <>
                  <CircleCheck className="size-5 text-ok" /> <span className="text-ok">In sync</span>
                </>
              ) : (
                <>
                  <CircleX className="size-5 text-bad" />{" "}
                  <span className="text-bad">{s.redis_up ? "Not in sync" : "Redis is down"}</span>
                </>
              )}
              <span className="font-normal text-slate">· refreshes every 5 seconds</span>
            </div>
            <dl className="grid gap-6 sm:grid-cols-3">
              <Stat label="Redis" value={s.redis_up ? "Up" : "Down"} />
              <Stat label="Customers in Redis" value={s.redis_customer_keys ?? "—"} />
              <Stat label="Customers in lakehouse" value={s.lakehouse_customers} />
            </dl>
            {!s.in_sync && s.redis_up && (
              <p className="text-sm text-slate">
                The counts differ. After a Redis restart, run the rebuild script and check again.
              </p>
            )}
          </div>
        )}
      </section>

      <section aria-labelledby="cons-h" className="space-y-4">
        <h2 id="cons-h" className="text-xl font-semibold text-ink">
          Check one customer
        </h2>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-3 sm:flex-row sm:items-start" noValidate>
          <div className="space-y-1.5 sm:w-72">
            <Label htmlFor="cons-id">Customer ID</Label>
            <Input id="cons-id" inputMode="numeric" maxLength={9} placeholder="9 digits" className="font-mono tnum" {...form.register("id")} />
            {form.formState.errors.id && <p className="text-sm text-destructive">{form.formState.errors.id.message}</p>}
          </div>
          <Button type="submit" className="sm:mt-[22px]" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Checking…" : "Compare balances"}
          </Button>
        </form>
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {result && (
          <Alert className={result.match ? "border-ok/30 bg-ok-bg" : "border-bad/30 bg-bad-bg"}>
            <AlertTitle>{result.match ? "Balances match" : "Balances differ"}</AlertTitle>
            <AlertDescription className="grid gap-1 sm:grid-cols-2">
              <span>Redis: <Money value={result.redis_total_balance} className="font-medium text-ink" /></span>
              <span>Lakehouse: <Money value={result.lakehouse_total_balance} className="font-medium text-ink" /></span>
            </AlertDescription>
          </Alert>
        )}
      </section>
    </div>
  );
}
