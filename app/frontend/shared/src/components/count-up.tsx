"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "../lib/gsap";
import { formatMoney } from "../lib/format";

/**
 * Animates a number from its previous value to `value`. First paint shows the final text (SSR-safe, reduced-motion
 * safe); GSAP then counts up. Subsequent value changes (live sync) animate from the old value.
 */
export function CountUp({
  value,
  format = formatMoney,
  duration = 1.2,
  className,
}: {
  value: number;
  format?: (n: number) => string;
  duration?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const shown = useRef<number | null>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      const from = shown.current ?? 0;
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduce || from === value) {
        el.textContent = format(value);
        shown.current = value;
        return;
      }
      const state = { v: from };
      gsap.to(state, {
        v: value,
        duration,
        ease: "power2.out",
        onUpdate: () => {
          el.textContent = format(state.v);
          shown.current = state.v;
        },
        onComplete: () => {
          el.textContent = format(value);
          shown.current = value;
        },
      });
    },
    { dependencies: [value], scope: ref },
  );

  return (
    <span ref={ref} className={className} aria-label={format(value)}>
      {format(value)}
    </span>
  );
}
