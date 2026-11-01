"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "../lib/utils";

export function CopyId({ value, label, className }: { value: string; label?: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          toast.success(`${label ?? "ID"} copied`);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          toast.error("Couldn't copy. Select the text and copy it manually.");
        }
      }}
      aria-label={`Copy ${label ?? "ID"} ${value}`}
      className={cn(
        "group inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 font-mono text-[13px] text-slate tnum transition-colors hover:bg-sky hover:text-ink",
        className,
      )}
    >
      {value}
      {copied ? <Check className="size-3.5 text-ok" /> : <Copy className="size-3.5 opacity-60 group-hover:opacity-100" />}
    </button>
  );
}
