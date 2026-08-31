
"use client";

import React, { useState } from "react";
import { LeadsTable } from "@/components/leads/LeadsTable";
import { StatCard } from "@/components/ui/StatCard";
import { Button } from "@/components/ui/Button";
import { useTaskManager } from "@/context/TaskContext";
import { Building2, Globe, TrendingUp, DollarSign, RefreshCw, Inbox, CheckCircle2, AlertCircle, Info } from "lucide-react";

function CheckRepliesButton() {
  const { refresh } = useTaskManager();
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{
    type: "success" | "info" | "error";
    message: string;
  } | null>(null);

  const handleSync = async () => {
    setSyncing(true);
    setSyncStatus(null);
    try {
      const res = await fetch("/api/inbox/sync", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Sync failed");

      if (data.result?.isConfigured === false) {
        setSyncStatus({
          type: "info",
          message: "Gmail Standby: Ready for GMAIL_USER credentials in settings.",
        });
      } else {
        setSyncStatus({
          type: "success",
          message: `Synced! ${data.result.newRepliesCount} new replies analyzed.`,
        });
        await refresh();
      }
      setTimeout(() => setSyncStatus(null), 6000);
    } catch (err: any) {
      setSyncStatus({
        type: "error",
        message: err.message || "Sync failed",
      });
      setTimeout(() => setSyncStatus(null), 6000);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {syncStatus && (
        <span
          className={`text-[11px] font-mono flex items-center gap-1.5 px-2.5 py-1 border rounded transition-all ${
            syncStatus.type === "success"
              ? "text-emerald-700 bg-emerald-50 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
              : syncStatus.type === "info"
              ? "text-neutral-700 bg-neutral-100 border-neutral-300 dark:bg-neutral-900 dark:text-neutral-300 dark:border-neutral-700"
              : "text-rose-700 bg-rose-50 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800"
          }`}
        >
          {syncStatus.type === "success" && <CheckCircle2 size={12} />}
          {syncStatus.type === "info" && <Info size={12} />}
          {syncStatus.type === "error" && <AlertCircle size={12} />}
          {syncStatus.message}
        </span>
      )}
      <Button
        size="sm"
        variant="secondary"
        onClick={handleSync}
        loading={syncing}
        icon={<Inbox size={13} />}
      >
        {syncing ? "Checking Gmail Inbound..." : "Check Replies (Gmail)"}
      </Button>
    </div>
  );
}

export default function LeadsPage() {
  const { leads } = useTaskManager();

  const avgWebsiteScore = leads.length > 0
    ? Math.round(leads.reduce((acc, l) => acc + l.websiteScore, 0) / leads.length)
    : 50;

  const mockupReadyCount = leads.filter(l => l.status === "Mockup Ready").length;

  return (
    <div className="space-y-6">
      {/* Top Banner Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="Identified Leads"
          value={leads.length}
          subtext="Target SMB & SaaS domains"
          icon={<Building2 size={16} />}
        />
        <StatCard
          label="Avg Target Site Score"
          value={`${avgWebsiteScore}/100`}
          subtext="Significant improvement need"
          change="High opportunity"
          changeType="positive"
          icon={<Globe size={16} />}
        />
        <StatCard
          label="Mockups Prepared"
          value={mockupReadyCount}
          subtext="Interactive demos ready"
          change="Ready to pitch"
          changeType="positive"
          icon={<TrendingUp size={16} />}
        />
        <StatCard
          label="Pipeline Deal Value"
          value="$54,600"
          subtext="Estimated aggregate potential"
          icon={<DollarSign size={16} />}
        />
      </div>

      {/* Main Leads Table */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
          <div>
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-[#555555]">
              Target Leads & Technical Audits ({leads.length})
            </h2>
            <span className="text-[11px] font-mono text-[#666666]">
              Database Driven Lead Records
            </span>
          </div>

          <div className="flex items-center gap-2">
            <CheckRepliesButton />
          </div>
        </div>

        <LeadsTable leads={leads} />
      </div>
    </div>
  );
}
