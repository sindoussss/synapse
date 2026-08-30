"use client";

import React from "react";
import { AIProviderSetting } from "@/data/types";
import { Button } from "@/components/ui/Button";
import { Cpu, Key, Activity, DollarSign, Check, RefreshCw } from "lucide-react";

interface AIProvidersSectionProps {
  providers: AIProviderSetting[];
}

export const AIProvidersSection: React.FC<AIProvidersSectionProps> = ({ providers }) => {
  return (
    <div className="bg-white border border-[#d4d4d0] rounded-none">
      <div className="p-4 border-b border-[#d4d4d0] bg-[#fafafa] flex items-center justify-between">
        <div>
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#111111]">
            AI Provider Infrastructure
          </h3>
          <p className="text-xs text-[#666666] mt-0.5">
            Manage LLM model routers, API credentials, and inference latency benchmarks.
          </p>
        </div>
        <Button size="sm" variant="outline" icon={<RefreshCw size={12} />}>
          Ping Endpoints
        </Button>
      </div>

      <div className="divide-y divide-[#d4d4d0]">
        {providers.map((prov) => (
          <div key={prov.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-[#111111]">{prov.name}</span>
                <span
                  className={`px-1.5 py-0.2 text-[10px] font-mono border rounded-none ${
                    prov.status === "connected"
                      ? "bg-[#f0fdf4] text-[#166534] border-[#166534]"
                      : "bg-[#f7f7f5] text-[#666666] border-[#d4d4d0]"
                  }`}
                >
                  {prov.status.toUpperCase()}
                </span>
              </div>
              <div className="text-xs font-mono text-[#555555] flex items-center gap-2">
                <span>Model: <strong className="text-[#1a365d]">{prov.model}</strong></span>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <Key size={11} className="text-[#666666]" /> {prov.keyMask}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs font-mono shrink-0">
              <div className="text-right">
                <span className="text-[10px] text-[#666666] block uppercase">LATENCY</span>
                <span className="text-[#111111] font-bold">{prov.latencyMs > 0 ? `${prov.latencyMs}ms` : "Offline"}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-[#666666] block uppercase">TODAY TOKENS</span>
                <span className="text-[#111111] font-bold">{prov.tokenUsageToday.toLocaleString()}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-[#666666] block uppercase">COST</span>
                <span className="text-[#166534] font-bold">{prov.costToday}</span>
              </div>
              <Button size="sm" variant="secondary">
                Configure
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
