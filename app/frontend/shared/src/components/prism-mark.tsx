import { cn } from "../lib/utils";

/** Brand mark: a triangle split into three facets of blue. */
export function PrismMark({ className, size = 28 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className={cn("shrink-0", className)}
    >
      <path d="M16 3 4 26h12V3Z" fill="#3B82F6" />
      <path d="M16 3v23h12L16 3Z" fill="#1D4ED8" />
      <path d="M4 26h24l-12-5L4 26Z" fill="#DBE8FF" fillOpacity=".9" />
    </svg>
  );
}

export function PrismWordmark({ className, inverted = false }: { className?: string; inverted?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <PrismMark />
      <span className={cn("font-display text-lg font-semibold tracking-tight", inverted ? "text-white" : "text-ink")}>
        Prism<span className={inverted ? "text-sky" : "text-cobalt"}>360</span>
      </span>
    </span>
  );
}
