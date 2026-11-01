import { formatMoney } from "../lib/format";
import { cn } from "../lib/utils";

export function Money({
  value,
  signed,
  className,
}: {
  value: string | number;
  signed?: "in" | "out";
  className?: string;
}) {
  return (
    <span className={cn("tnum whitespace-nowrap", signed === "in" && "text-ok", className)}>
      {signed === "in" ? "+" : signed === "out" ? "−" : ""}
      {formatMoney(value)}
    </span>
  );
}
