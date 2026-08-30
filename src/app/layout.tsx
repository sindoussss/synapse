import type { Metadata } from "next";
import { Suspense } from "react";
import { Geist, Newsreader } from "next/font/google";
import "./globals.css";
import { RootChrome } from "@/components/layout/RootChrome";

const opsSans = Geist({
  subsets: ["latin"],
  variable: "--font-ops-sans",
  display: "swap",
});

const opsDisplay = Newsreader({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-ops-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Synapse Ops // Autonomous AI Website Business",
    template: "%s",
  },
  description: "Operations dashboard for autonomous multi-agent agency pipeline",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${opsSans.variable} ${opsDisplay.variable}`}>
      <body className={`${opsSans.className} antialiased`}>
        <Suspense fallback={null}>
          <RootChrome>{children}</RootChrome>
        </Suspense>
      </body>
    </html>
  );
}
