"use client";

import { LogOut, User } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { PrismWordmark } from "@prism/ui/components/prism-mark";
import { Button } from "@prism/ui/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@prism/ui/ui/dropdown-menu";
import { cn } from "@prism/ui/lib/utils";
import { useCustomer } from "@/lib/api";
import { signOut } from "@/lib/session";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/profile", label: "Profile" },
];

export function AppShell({ customerId, children }: { customerId: string; children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: customer } = useCustomer(customerId);
  const name = customer ? `${customer.first_name} ${customer.last_name}` : "Your account";

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1200px] items-center gap-6 px-4 sm:px-6">
          <Link href="/dashboard" aria-label="Prism360 home">
            <PrismWordmark />
          </Link>
          <nav aria-label="Main" className="flex items-center gap-1">
            {NAV.map((item) => {
              const active = pathname === item.href || (item.href === "/dashboard" && pathname.startsWith("/accounts"));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    active ? "bg-sky text-cobalt" : "text-slate hover:bg-muted hover:text-ink",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="ml-auto">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2 px-2">
                  <span className="flex size-8 items-center justify-center rounded-full bg-cobalt text-sm font-semibold text-white">
                    {customer ? customer.first_name[0]?.toUpperCase() : <User className="size-4" />}
                  </span>
                  <span className="hidden text-sm font-medium text-ink sm:inline">{name}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="space-y-0.5">
                  <span className="block text-ink">{name}</span>
                  <span className="block font-mono text-xs font-normal text-slate tnum">{customerId}</span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={() => {
                    signOut();
                    router.replace("/");
                  }}
                >
                  <LogOut /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1200px] px-4 py-8 sm:px-6 sm:py-10">{children}</main>
    </div>
  );
}
