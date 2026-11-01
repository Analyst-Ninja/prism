import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Providers } from "@prism/ui/components/providers";
import { fontVariables } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Prism360", template: "%s · Prism360" },
  description: "Your accounts, updated the moment anything changes.",
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
