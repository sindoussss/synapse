"use client";

import { usePathname } from "next/navigation";
import { AppShell } from "./AppShell";
import { OperatorSessionGate } from "./OperatorSessionGate";

function isPublicChromePath(pathname: string): boolean {
  return (
    pathname === "/login" ||
    pathname.startsWith("/login/") ||
    pathname === "/research" ||
    pathname.startsWith("/research/") ||
    pathname.startsWith("/client") ||
    pathname.startsWith("/esign") ||
    pathname.startsWith("/preview")
  );
}

export function RootChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (isPublicChromePath(pathname)) {
    return <>{children}</>;
  }
  return (
    <OperatorSessionGate>
      <AppShell>{children}</AppShell>
    </OperatorSessionGate>
  );
}
