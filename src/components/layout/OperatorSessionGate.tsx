"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

export function OperatorSessionGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [state, setState] = useState<"loading" | "ok" | "unauthenticated">("loading");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/auth/session");
        const data = await res.json().catch(() => ({ authenticated: false }));
        if (cancelled) return;
        if (data?.authenticated) {
          setState("ok");
        } else {
          setState("unauthenticated");
          const next = encodeURIComponent(pathname || "/");
          router.replace(`/login?next=${next}`);
        }
      } catch {
        if (!cancelled) {
          setState("unauthenticated");
          router.replace("/login");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  if (state !== "ok") {
    return (
      <div className="min-h-screen bg-white text-[#666] flex items-center justify-center text-sm">
        Checking operator session…
      </div>
    );
  }

  return <>{children}</>;
}
