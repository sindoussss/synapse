"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Menu } from "lucide-react";
import { useTaskManager, type EnvironmentFilter } from "@/context/TaskContext";

interface HeaderProps {
  onOpenSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenSidebar }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { dbStatus, dbStatusMessage, environmentFilter, setEnvironmentFilter } = useTaskManager();
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setSignedIn(Boolean(data?.authenticated));
      })
      .catch(() => {
        if (!cancelled) setSignedIn(false);
      });
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  const getPageMeta = () => {
    switch (pathname) {
      case "/":
        return { title: "Operations Overview", section: "Dashboard" };
      case "/agents":
        return { title: "Autonomous Agent Fleet", section: "Fleet Management" };
      case "/tasks":
        return { title: "Task Execution Board", section: "Pipeline" };
      case "/leads":
        return { title: "Prospects & Target Leads", section: "Pipeline" };
      case "/approvals":
        return { title: "Action Approval Queue", section: "Safety & Governance" };
      case "/activity":
        return { title: "System Activity Stream", section: "Telemetry" };
      case "/settings":
        return { title: "System Configuration", section: "Operations" };
      default:
        return { title: "Operations Console", section: "Autonomous Ops" };
    }
  };

  const { title, section } = getPageMeta();

  return (
    <header className="sticky top-0 z-30 flex items-end justify-between gap-4 min-h-[4.5rem] px-6 lg:px-12 pt-6 pb-4 bg-white border-b border-[#e5e5e5]">
      <div className="flex items-end gap-3 min-w-0">
        <button
          onClick={onOpenSidebar}
          className="p-1 text-[#111] lg:hidden cursor-pointer"
          aria-label="Open navigation menu"
        >
          <Menu size={18} />
        </button>

        <div className="min-w-0">
          <div className="text-[12px] text-[#888] mb-1">
            {section}
          </div>
          <h1 className="ops-display text-[28px] leading-none text-[#111] truncate">
            {title}
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-5 text-[13px] text-[#111] pb-1">
        <label className="flex items-center gap-2">
          <span className="text-[#888]">Env</span>
          <select
            value={environmentFilter}
            onChange={(e) => setEnvironmentFilter(e.target.value as EnvironmentFilter)}
            className="bg-transparent text-[#111] focus:outline-none cursor-pointer"
          >
            <option value="LIVE_REAL">Production</option>
            <option value="CONTROLLED_TEST">Controlled Test</option>
            <option value="SYNTHETIC">Synthetic</option>
            <option value="ARCHIVED_TEST">Archived Tests</option>
            <option value="ALL">All Environments</option>
          </select>
        </label>

        <span title={dbStatusMessage}>
          {dbStatus === "connected"
            ? "Supabase PostgreSQL"
            : dbStatus === "disconnected"
            ? "Supabase disconnected"
            : "Local repository"}
        </span>
        {signedIn ? (
          <button
            type="button"
            onClick={signOut}
            className="text-[#111] underline-offset-2 hover:underline cursor-pointer"
          >
            Sign out
          </button>
        ) : null}
      </div>
    </header>
  );
};
