"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, type ReactNode } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Alert, AlertDescription } from "@prism/ui/ui/alert";
import { Button } from "@prism/ui/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@prism/ui/ui/dialog";
import { Input } from "@prism/ui/ui/input";
import { Label } from "@prism/ui/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@prism/ui/ui/select";
import { formatMoney, groupAccountNumber, titleCase } from "@prism/ui/lib/format";
import type { Account } from "@prism/ui/lib/types";
import { actions, useApiMutation } from "@/lib/api";
import { errorMessage } from "@/lib/errors";

const amountField = z
  .string()
  .trim()
  .regex(/^\d+(\.\d{1,2})?$/, "Enter an amount like 250 or 250.50")
  .refine((v) => Number(v) > 0, "Amount must be more than 0");

function ServerError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <Alert variant="destructive" role="alert" className="border-bad/25 bg-bad-bg">
      <AlertDescription className="font-medium text-bad">{message.charAt(0).toUpperCase() + message.slice(1)}</AlertDescription>
    </Alert>
  );
}

function FieldError({ message }: { message?: string }) {
  return message ? <p className="text-sm text-destructive">{message}</p> : null;
}

function AccountSelect({
  accounts,
  value,
  onChange,
  id,
}: {
  accounts: Account[];
  value: string;
  onChange: (v: string) => void;
  id: string;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger id={id} className="w-full">
        <SelectValue placeholder="Choose an account" />
      </SelectTrigger>
      <SelectContent>
        {accounts.map((a) => (
          <SelectItem key={a.account_number} value={a.account_number}>
            {titleCase(a.type)} · {groupAccountNumber(a.account_number)} · {formatMoney(a.balance)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// ---------- Deposit / Withdraw
const moneySchema = z.object({ account: z.string().min(1, "Choose an account"), amount: amountField });

export function MoneyDialog({
  kind,
  open,
  onOpenChange,
  accounts,
  defaultAccount,
}: {
  kind: "deposit" | "withdraw";
  open: boolean;
  onOpenChange: (o: boolean) => void;
  accounts: Account[];
  defaultAccount?: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const usable = accounts.filter((a) => a.status === "active");
  const form = useForm<z.infer<typeof moneySchema>>({
    resolver: zodResolver(moneySchema),
    values: { account: defaultAccount ?? usable[0]?.account_number ?? "", amount: "" },
  });
  const mutation = useApiMutation(({ account, amount }: z.infer<typeof moneySchema>) =>
    kind === "deposit" ? actions.deposit(account, amount) : actions.withdraw(account, amount),
  );
  const verb = kind === "deposit" ? "Deposit" : "Withdraw";

  async function onSubmit(v: z.infer<typeof moneySchema>) {
    setError(null);
    try {
      await mutation.mutateAsync(v);
      toast.success(`${kind === "deposit" ? "Deposited" : "Withdrew"} ${formatMoney(v.amount)}`);
      onOpenChange(false);
      form.reset();
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) setError(null); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{verb}</DialogTitle>
          <DialogDescription>
            {kind === "deposit" ? "Add money to one of your accounts." : "Take money out of one of your accounts."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="money-account">Account</Label>
            <Controller
              control={form.control}
              name="account"
              render={({ field }) => (
                <AccountSelect id="money-account" accounts={usable} value={field.value} onChange={field.onChange} />
              )}
            />
            <FieldError message={form.formState.errors.account?.message} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="money-amount">Amount</Label>
            <Input id="money-amount" inputMode="decimal" placeholder="0.00" className="tnum" autoFocus {...form.register("amount")} />
            <FieldError message={form.formState.errors.amount?.message} />
          </div>
          <ServerError message={error} />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? `${verb}…` : verb}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------- Transfer
const transferSchema = z.object({
  from: z.string().min(1, "Choose an account"),
  to: z.string().regex(/^\d{15}$/, "Enter the 15-digit account number"),
  amount: amountField,
});

export function TransferDialog({
  open,
  onOpenChange,
  accounts,
  defaultFrom,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  accounts: Account[];
  defaultFrom?: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const usable = accounts.filter((a) => a.status === "active");
  const form = useForm<z.infer<typeof transferSchema>>({
    resolver: zodResolver(transferSchema),
    values: { from: defaultFrom ?? usable[0]?.account_number ?? "", to: "", amount: "" },
  });
  const mutation = useApiMutation((v: z.infer<typeof transferSchema>) => actions.transfer(v.from, v.to, v.amount));
  const from = useWatch({ control: form.control, name: "from" });
  const ownTargets = accounts.filter((a) => a.account_number !== from && a.status === "active");

  async function onSubmit(v: z.infer<typeof transferSchema>) {
    setError(null);
    try {
      await mutation.mutateAsync(v);
      toast.success(`Transferred ${formatMoney(v.amount)}`);
      onOpenChange(false);
      form.reset();
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) setError(null); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Transfer</DialogTitle>
          <DialogDescription>Move money to one of your accounts or to any 15-digit account number.</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="tr-from">From</Label>
            <Controller
              control={form.control}
              name="from"
              render={({ field }) => (
                <AccountSelect id="tr-from" accounts={usable} value={field.value} onChange={field.onChange} />
              )}
            />
            <FieldError message={form.formState.errors.from?.message} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tr-to">To account number</Label>
            <Input id="tr-to" inputMode="numeric" maxLength={15} placeholder="15 digits" className="font-mono tnum" {...form.register("to")} />
            <FieldError message={form.formState.errors.to?.message} />
            {ownTargets.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {ownTargets.map((a) => (
                  <Button
                    key={a.account_number}
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => form.setValue("to", a.account_number, { shouldValidate: true })}
                  >
                    My {a.type} …{a.account_number.slice(-4)}
                  </Button>
                ))}
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="tr-amount">Amount</Label>
            <Input id="tr-amount" inputMode="decimal" placeholder="0.00" className="tnum" {...form.register("amount")} />
            <FieldError message={form.formState.errors.amount?.message} />
          </div>
          <ServerError message={error} />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Transferring…" : "Transfer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------- Open account
export function OpenAccountDialog({
  open,
  onOpenChange,
  customerId,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  customerId: string;
}) {
  const [type, setType] = useState<"savings" | "current">("savings");
  const [error, setError] = useState<string | null>(null);
  const mutation = useApiMutation((t: "savings" | "current") => actions.openAccount(customerId, t));

  async function submit() {
    setError(null);
    try {
      const acc = await mutation.mutateAsync(type);
      toast.success(`Opened ${type} account ${groupAccountNumber(acc.account_number)}`);
      onOpenChange(false);
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) setError(null); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Open account</DialogTitle>
          <DialogDescription>Choose the type of account to open. It starts with a zero balance.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="acct-type">Account type</Label>
          <Select value={type} onValueChange={(v) => setType(v as "savings" | "current")}>
            <SelectTrigger id="acct-type" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="savings">Savings</SelectItem>
              <SelectItem value="current">Current</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <ServerError message={error} />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={mutation.isPending}>
            {mutation.isPending ? "Opening…" : "Open account"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------- Confirm (freeze / unfreeze / close)
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  destructive,
  onConfirm,
  successMessage,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  destructive?: boolean;
  onConfirm: () => Promise<unknown>;
  successMessage: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const mutation = useApiMutation(onConfirm);

  async function run() {
    setError(null);
    try {
      await mutation.mutateAsync(undefined);
      toast.success(successMessage);
      onOpenChange(false);
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) setError(null); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <ServerError message={error} />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant={destructive ? "destructive" : "default"} onClick={run} disabled={mutation.isPending}>
            {mutation.isPending ? `${confirmLabel}…` : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
