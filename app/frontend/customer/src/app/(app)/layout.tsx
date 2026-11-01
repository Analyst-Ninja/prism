"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { Skeleton } from "@prism/ui/ui/skeleton";
import { AppShell } from "@/components/app-shell";
import { useSession } from "@/lib/session";

export default function AppLayout({ children }: { children: ReactNode }) {
  const session = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session === null) router.replace("/");
  }, [session, router]);

  if (!session) {
    return (
      <div className="mx-auto max-w-[1200px] space-y-6 px-6 py-10" aria-busy="true">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }
  return <AppShell customerId={session}>{children}</AppShell>;
}
