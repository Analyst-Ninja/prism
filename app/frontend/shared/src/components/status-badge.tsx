import { Badge } from "../ui/badge";
import { titleCase } from "../lib/format";
import { cn } from "../lib/utils";

const TONES: Record<string, string> = {
  active: "bg-ok-bg text-ok border-transparent",
  approved: "bg-ok-bg text-ok border-transparent",
  completed: "bg-ok-bg text-ok border-transparent",
  frozen: "bg-warn-bg text-warn border-transparent",
  reversed: "bg-warn-bg text-warn border-transparent",
  dormant: "bg-warn-bg text-warn border-transparent",
  failed: "bg-bad-bg text-bad border-transparent",
  closed: "bg-muted text-slate border-transparent",
  kyc_pending: "bg-sky text-cobalt border-transparent",
  pending: "bg-sky text-cobalt border-transparent",
};

export function StatusBadge({ status, label, className }: { status: string; label?: string; className?: string }) {
  return (
    <Badge variant="outline" className={cn("font-medium", TONES[status] ?? "bg-muted text-slate", className)}>
      {label ?? titleCase(status)}
    </Badge>
  );
}
