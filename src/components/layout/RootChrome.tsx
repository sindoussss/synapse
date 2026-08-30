"use client";

import { usePathname } from "next/navigation";
import { AppShell } from "./AppShell";

export function RootChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/research" || pathname.startsWith("/research/")) {
    return <>{children}</>;
  }
  return <AppShell>{children}</AppShell>;
}
