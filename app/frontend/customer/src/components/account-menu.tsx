"use client";

import { MoreHorizontal } from "lucide-react";
import { Button } from "@prism/ui/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@prism/ui/ui/dropdown-menu";
import type { Account } from "@prism/ui/lib/types";
import type { DialogAction } from "./account-dialog-host";

export function AccountMenu({ account, onAction }: { account: Account; onAction: (a: DialogAction) => void }) {
  const closed = account.status === "closed";
  const frozen = account.status === "frozen";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`Actions for account ending ${account.account_number.slice(-4)}`}>
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem disabled={closed || frozen} onSelect={() => onAction({ kind: "deposit", account })}>
          Deposit
        </DropdownMenuItem>
        <DropdownMenuItem disabled={closed || frozen} onSelect={() => onAction({ kind: "withdraw", account })}>
          Withdraw
        </DropdownMenuItem>
        <DropdownMenuItem disabled={closed || frozen} onSelect={() => onAction({ kind: "transfer", account })}>
          Transfer
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {frozen ? (
          <DropdownMenuItem onSelect={() => onAction({ kind: "unfreeze", account })}>Unfreeze</DropdownMenuItem>
        ) : (
          <DropdownMenuItem disabled={closed} onSelect={() => onAction({ kind: "freeze", account })}>
            Freeze
          </DropdownMenuItem>
        )}
        <DropdownMenuItem disabled={closed} variant="destructive" onSelect={() => onAction({ kind: "close", account })}>
          Close account
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
