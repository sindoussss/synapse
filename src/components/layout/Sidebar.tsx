"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { useTaskManager } from "@/context/TaskContext";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const pathname = usePathname();
  const { stats, approvals, leads, agents, dbStatus } = useTaskManager();

  const pendingApprovalsCount = approvals.filter((a) => a.status === "pending").length;

  const navItems = [
    {
      name: "Overview",
      href: "/",
      badge: null,
    },
    {
      name: "Agents",
      href: "/agents",
      badge: agents.length > 0 ? String(agents.length) : "5",
    },
    {
      name: "Tasks",
      href: "/tasks",
      badge: stats.total > 0 ? String(stats.total) : null,
    },
    {
      name: "Leads",
      href: "/leads",
      badge: leads.length > 0 ? String(leads.length) : "10",
    },
    {
      name: "Approvals",
      href: "/approvals",
      badge: pendingApprovalsCount > 0 ? String(pendingApprovalsCount) : null,
      badgeHighlight: pendingApprovalsCount > 0,
    },
    {
      name: "Activity",
      href: "/activity",
      badge: null,
    },
    {
      name: "Settings",
      href: "/settings",
      badge: null,
    },
  ];

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-60 bg-white border-r border-[#e5e5e5] flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-start justify-between px-7 pt-8 pb-8">
          <div>
            <Link href="/" className="ops-display text-[26px] leading-none text-[#111] no-underline">
              Synapse
            </Link>
            <div className="mt-2 text-[13px] text-[#333]">
              Operations
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-1 text-[#666] hover:text-[#111] cursor-pointer"
            aria-label="Close Sidebar"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-7 pb-6 text-[13px] text-[#111]">
          {dbStatus === "connected" ? "Supabase live" : "Local standby"}
        </div>

        <nav className="flex-1 px-7 overflow-y-auto">
          {navItems.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname === item.href || pathname.startsWith(item.href + "/");

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={onClose}
                className={`flex items-baseline justify-between py-2.5 text-[15px] border-b border-transparent ${
                  isActive
                    ? "text-[#111] border-[#111]"
                    : "text-[#333] hover:text-[#111]"
                }`}
              >
                <span>{item.name}</span>
                {item.badge && (
                  <span
                    className={`tabular-nums text-[13px] ${
                      item.badgeHighlight ? "text-[#111]" : "text-[#888]"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="px-7 py-6 text-[12px] leading-relaxed text-[#666]">
          <div>
            {dbStatus === "connected" ? "Supabase PostgreSQL" : "Local repository"}
          </div>
          <div>Persistence ready</div>
        </div>
      </aside>
    </>
  );
};
