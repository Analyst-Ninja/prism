"use client";

import { useRef, type ReactNode } from "react";
import { gsap, useGSAP } from "../lib/gsap";
import { cn } from "../lib/utils";

/**
 * Highlights its children for ~1.2s whenever `watch` changes after the first render.
 * Used to show a value that just arrived through live sync.
 */
export function Flash({ watch, children, className }: { watch: unknown; children: ReactNode; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const first = useRef(true);

  useGSAP(
    () => {
      if (first.current) {
        first.current = false;
        return;
      }
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      gsap.fromTo(
        ref.current,
        { backgroundColor: "#DBE8FF" },
        { backgroundColor: "rgba(219,232,255,0)", duration: 1.4, ease: "power2.out" },
      );
    },
    { dependencies: [String(watch)], scope: ref },
  );

  return (
    <span ref={ref} className={cn("inline-block rounded-md", className)}>
      {children}
    </span>
  );
}
