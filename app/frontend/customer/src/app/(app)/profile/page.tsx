"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { CopyId } from "@prism/ui/components/copy-id";
import { PageHeader } from "@prism/ui/components/page-header";
import { ErrorState } from "@prism/ui/components/states";
import { StatusBadge } from "@prism/ui/components/status-badge";
import { Alert, AlertDescription } from "@prism/ui/ui/alert";
import { Button } from "@prism/ui/ui/button";
import { Input } from "@prism/ui/ui/input";
import { Label } from "@prism/ui/ui/label";
import { Skeleton } from "@prism/ui/ui/skeleton";
import { formatDate } from "@prism/ui/lib/format";
import type { Customer } from "@prism/ui/lib/types";
import { ConfirmDialog } from "@/components/dialogs";
import { actions, useApiMutation, useCustomer } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { signOut, useSession } from "@/lib/session";

const schema = z.object({
  first_name: z.string().trim().min(1, "Enter your first name"),
  last_name: z.string().trim().min(1, "Enter your last name"),
  phone: z.string().trim().regex(/^(\d{7,15})?$/, "Use digits only, 7 to 15 of them"),
});

export default function ProfilePage() {
  const customerId = useSession()!;
  const customer = useCustomer(customerId);
  if (customer.isError) return <ErrorState message={errorMessage(customer.error)} onRetry={() => customer.refetch()} />;
  if (!customer.data) return <Skeleton className="h-64 w-full" />;
  return <ProfileBody customer={customer.data} />;
}

function ProfileBody({ customer }: { customer: Customer }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);
  const closed = customer.status === "closed";
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    values: { first_name: customer.first_name, last_name: customer.last_name, phone: customer.phone ?? "" },
  });
  const save = useApiMutation((v: z.infer<typeof schema>) =>
    actions.updateCustomer(customer.customer_id, { ...v, phone: v.phone || undefined }),
  );
  const approve = useApiMutation(() => actions.approveKyc(customer.customer_id));
  const err = form.formState.errors;

  async function onSubmit(v: z.infer<typeof schema>) {
    setError(null);
    try {
      await save.mutateAsync(v);
      toast.success("Details saved");
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  return (
    <div className="max-w-2xl space-y-10">
      <PageHeader title="Profile" description="Your details and verification status." />

      <section className="space-y-4 rounded-xl border border-border bg-card p-6">
        <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-slate">Customer ID</dt>
            <dd>
              <CopyId value={customer.customer_id} label="Customer ID" className="-ml-1.5 text-base text-ink" />
            </dd>
          </div>
          <div>
            <dt className="text-sm text-slate">Status</dt>
            <dd className="pt-1">
              <StatusBadge status={customer.status} />
            </dd>
          </div>
          <div>
            <dt className="text-sm text-slate">Email</dt>
            <dd className="text-sm font-medium text-ink">{customer.email}</dd>
          </div>
          <div>
            <dt className="text-sm text-slate">Customer since</dt>
            <dd className="text-sm font-medium text-ink">{formatDate(customer.created_at)}</dd>
          </div>
        </dl>
        {customer.status === "kyc_pending" && (
          <Alert>
            <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <span>KYC is pending. Demo only: approve it here to open accounts.</span>
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
                Approve KYC
              </Button>
            </AlertDescription>
          </Alert>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-ink">Contact details</h2>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="p-first">First name</Label>
              <Input id="p-first" disabled={closed} aria-invalid={!!err.first_name} {...form.register("first_name")} />
              {err.first_name && <p className="text-sm text-destructive">{err.first_name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="p-last">Last name</Label>
              <Input id="p-last" disabled={closed} aria-invalid={!!err.last_name} {...form.register("last_name")} />
              {err.last_name && <p className="text-sm text-destructive">{err.last_name.message}</p>}
            </div>
          </div>
          <div className="space-y-2 sm:max-w-xs">
            <Label htmlFor="p-phone">Phone</Label>
            <Input id="p-phone" inputMode="tel" disabled={closed} aria-invalid={!!err.phone} {...form.register("phone")} />
            {err.phone && <p className="text-sm text-destructive">{err.phone.message}</p>}
          </div>
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <Button type="submit" disabled={closed || save.isPending || !form.formState.isDirty}>
            {save.isPending ? "Saving…" : "Save changes"}
          </Button>
        </form>
      </section>

      <section className="space-y-3 rounded-xl border border-bad/25 p-6">
        <h2 className="text-xl font-semibold text-ink">Close customer</h2>
        <p className="max-w-prose text-sm text-slate">
          Closing your customer record can&apos;t be undone. Close all of your accounts first.
        </p>
        <Button variant="destructive" disabled={closed} onClick={() => setClosing(true)}>
          Close customer
        </Button>
      </section>

      {closing && (
        <ConfirmDialog
          open
          onOpenChange={(o) => !o && setClosing(false)}
          title="Close customer"
          description="This permanently closes your customer record. You'll be signed out."
          confirmLabel="Close customer"
          destructive
          successMessage="Customer closed"
          onConfirm={async () => {
            const r = await actions.closeCustomer(customer.customer_id);
            signOut();
            router.replace("/");
            return r;
          }}
        />
      )}
    </div>
  );
}
