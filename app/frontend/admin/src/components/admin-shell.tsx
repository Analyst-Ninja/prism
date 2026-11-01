"use client";

import { Activity, BarChart3, Menu, Search, Users } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { PrismWordmark } from "@prism/ui/components/prism-mark";
import { Button } from "@prism/ui/ui/button";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@prism/ui/ui/command";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@prism/ui/ui/sheet";
import { cn } from "@prism/ui/lib/utils";
import { useCustomerSearch } from "@/lib/api";

const NAV = [
  { href: "/customers", label: "Customer 360", icon: Users },
  { href: "/explore", label: "Explore", icon: BarChart3 },
  { href: "/ops", label: "Ops status", icon: Activity },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="space-y-1">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active ? "bg-white/12 text-white" : "text-sidebar-foreground/75 hover:bg-white/8 hover:text-white",
            )}
          >
            <Icon className="size-4" /> {label}
          </Link>
        );
      })}
    </nav>
  );
}

function SearchPalette() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const router = useRouter();
  const results = useCustomerSearch(open ? q : "");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <Button variant="outline" className="w-full justify-start gap-2 text-slate sm:w-72" onClick={() => setOpen(true)}>
        <Search className="size-4" />
        <span className="flex-1 text-left">Find a customer</span>
        <kbd className="hidden rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[11px] sm:inline">⌘K</kbd>
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen} title="Find a customer" description="Search by name, email or customer ID">
        <CommandInput placeholder="Name, email or 9-digit ID" value={q} onValueChange={setQ} />
        <CommandList>
          <CommandEmpty>No customer matches “{q}”.</CommandEmpty>
          <CommandGroup heading="Customers">
            {(results.data ?? []).map((c) => (
              <CommandItem
                key={c.customer_id}
                value={`${c.customer_id} ${c.first_name} ${c.last_name} ${c.email}`}
                onSelect={() => {
                  setOpen(false);
                  router.push(`/customers/${c.customer_id}`);
                }}
              >
                <span className="font-medium">
                  {c.first_name} {c.last_name}
                </span>
                <span className="ml-auto font-mono text-xs text-slate tnum">{c.customer_id}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}

export function AdminShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[240px_1fr]">
      <aside className="hidden bg-sidebar p-5 lg:flex lg:flex-col lg:gap-8">
        <PrismWordmark inverted />
        <NavLinks />
        <p className="mt-auto text-xs leading-relaxed text-sidebar-foreground/60">
          Admin view. Live data comes from Redis; search and Explore read the lakehouse.
        </p>
      </aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-card/95 px-4 backdrop-blur sm:px-8">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu">
                <Menu />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 border-0 bg-sidebar p-5">
              <SheetTitle className="sr-only">Menu</SheetTitle>
              <div className="space-y-8">
                <PrismWordmark inverted />
                <NavLinks onNavigate={() => setMobileOpen(false)} />
              </div>
            </SheetContent>
          </Sheet>
          <SearchPalette />
        </header>
        <main className="mx-auto max-w-[1200px] px-4 py-8 sm:px-8 sm:py-10">{children}</main>
      </div>
    </div>
  );
}
