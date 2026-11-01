"use client";

import { groupAccountNumber } from "@prism/ui/lib/format";
import type { Account } from "@prism/ui/lib/types";
import { actions } from "@/lib/api";
import { ConfirmDialog, MoneyDialog, OpenAccountDialog, TransferDialog } from "./dialogs";

export type DialogAction =
  | { kind: "deposit" | "withdraw" | "transfer"; account?: Account }
  | { kind: "freeze" | "unfreeze" | "close"; account: Account }
  | { kind: "open" }
  | null;

/** One place that renders whichever dialog the page asked for. */
export function AccountDialogHost({
  action,
  onClose,
  accounts,
  customerId,
  afterClose,
}: {
  action: DialogAction;
  onClose: () => void;
  accounts: Account[];
  customerId: string;
  afterClose?: () => void;
}) {
  const onOpenChange = (o: boolean) => {
    if (!o) onClose();
  };
  if (!action) return null;

  switch (action.kind) {
    case "deposit":
    case "withdraw":
      return (
        <MoneyDialog
          kind={action.kind}
          open
          onOpenChange={onOpenChange}
          accounts={accounts}
          defaultAccount={action.account?.account_number}
        />
      );
    case "transfer":
      return <TransferDialog open onOpenChange={onOpenChange} accounts={accounts} defaultFrom={action.account?.account_number} />;
    case "open":
      return <OpenAccountDialog open onOpenChange={onOpenChange} customerId={customerId} />;
    case "freeze":
      return (
        <ConfirmDialog
          open
          onOpenChange={onOpenChange}
          title="Freeze account"
          description={`No deposits, withdrawals or transfers can be made on ${groupAccountNumber(action.account.account_number)} until you unfreeze it.`}
          confirmLabel="Freeze"
          successMessage="Account frozen"
          onConfirm={() => actions.freeze(action.account.account_number)}
        />
      );
    case "unfreeze":
      return (
        <ConfirmDialog
          open
          onOpenChange={onOpenChange}
          title="Unfreeze account"
          description={`${groupAccountNumber(action.account.account_number)} will accept transactions again.`}
          confirmLabel="Unfreeze"
          successMessage="Account unfrozen"
          onConfirm={() => actions.unfreeze(action.account.account_number)}
        />
      );
    case "close":
      return (
        <ConfirmDialog
          open
          onOpenChange={onOpenChange}
          title="Close account"
          description={`Closing ${groupAccountNumber(action.account.account_number)} can't be undone. The balance must be zero.`}
          confirmLabel="Close account"
          destructive
          successMessage="Account closed"
          onConfirm={async () => {
            const r = await actions.closeAccount(action.account.account_number);
            afterClose?.();
            return r;
          }}
        />
      );
  }
}
