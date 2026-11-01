import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Providers } from "@prism/ui/components/providers";
import { fontVariables } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Prism360 Admin", template: "%s · Prism360 Admin" },
  description: "Customer 360 for operations.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={fontVariables}>
      <body className="min-h-dvh antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
