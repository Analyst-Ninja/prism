import { AlertCircle, Inbox } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "../ui/button";

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed border-input bg-card/60 px-6 py-10">
      <div className="flex size-10 items-center justify-center rounded-lg bg-sky text-cobalt">
        {icon ?? <Inbox className="size-5" />}
      </div>
      <div className="space-y-1">
        <p className="font-display text-base font-semibold text-ink">{title}</p>
        {description && <p className="max-w-prose text-sm text-slate">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function ErrorState({
  title = "Couldn't load this",
  message,
  onRetry,
}: {
  title?: string;
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div role="alert" className="flex flex-col items-start gap-3 rounded-xl border border-bad/25 bg-bad-bg px-6 py-8">
      <AlertCircle className="size-5 text-bad" />
      <div className="space-y-1">
        <p className="font-display text-base font-semibold text-ink">{title}</p>
        <p className="max-w-prose text-sm text-slate">{message}</p>
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
