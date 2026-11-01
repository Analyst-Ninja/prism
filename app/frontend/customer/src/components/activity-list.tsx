import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight } from "lucide-react";
import { Money } from "@prism/ui/components/money";
import { timeAgo } from "@prism/ui/lib/format";
import type { Transaction } from "@prism/ui/lib/types";
import { cn } from "@prism/ui/lib/utils";
import { describeTxn } from "@/lib/txn";

export function ActivityList({ items, own }: { items: Transaction[]; own: Set<string> }) {
  return (
    <ul className="divide-y divide-border">
      {items.map((t) => {
        const d = describeTxn(t, own);
        const Icon = d.direction === "in" ? ArrowDownLeft : d.direction === "out" ? ArrowUpRight : ArrowLeftRight;
        return (
          <li key={t.id} className="flex items-center gap-3 py-3">
            <span
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-full",
                d.direction === "in" ? "bg-ok-bg text-ok" : "bg-sky text-cobalt",
              )}
            >
              <Icon className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink">{d.label}</p>
              <p className="truncate text-xs text-slate">
                {d.detail} · {timeAgo(t.created_at)}
              </p>
            </div>
            <Money
              value={t.amount}
              signed={d.direction === "neutral" ? undefined : d.direction}
              className="text-sm font-medium text-ink"
            />
          </li>
        );
      })}
    </ul>
  );
}
