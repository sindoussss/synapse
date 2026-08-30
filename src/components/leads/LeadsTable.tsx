"use client";

import React, { useState } from "react";
import { Lead } from "@/data/types";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ScoreBadge } from "@/components/ui/ScoreBadge";
import { Button } from "@/components/ui/Button";
import { LeadDetailModal } from "./LeadDetailModal";
import { Search, Globe, Filter, ExternalLink, ArrowUpDown } from "lucide-react";

interface LeadsTableProps {
  leads: Lead[];
}

export const LeadsTable: React.FC<LeadsTableProps> = ({ leads }) => {
  const [search, setSearch] = useState("");
  const [industryFilter, setIndustryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  const industries = Array.from(new Set(leads.map((l) => l.industry)));
  const statuses = Array.from(new Set(leads.map((l) => l.status)));

  const filteredLeads = leads.filter((lead) => {
    const matchesSearch =
      lead.company.toLowerCase().includes(search.toLowerCase()) ||
      lead.website.toLowerCase().includes(search.toLowerCase()) ||
      lead.industry.toLowerCase().includes(search.toLowerCase());

    const matchesIndustry = industryFilter === "all" || lead.industry === industryFilter;
    const matchesStatus = statusFilter === "all" || lead.status === statusFilter;

    return matchesSearch && matchesIndustry && matchesStatus;
  });

  return (
    <div className="space-y-4">
      {/* Filter Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-white border border-[#d4d4d0]">
        <div className="relative flex-1 max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#666666]" />
          <input
            type="text"
            placeholder="Search company, website, or keyword..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-[#f7f7f5] border border-[#d4d4d0] text-xs font-mono text-[#111111] placeholder-[#888888] focus:outline-none focus:border-[#111111] rounded-none"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={industryFilter}
            onChange={(e) => setIndustryFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-[#f7f7f5] border border-[#d4d4d0] text-xs font-mono text-[#111111] focus:outline-none focus:border-[#111111] rounded-none cursor-pointer"
          >
            <option value="all">All Industries</option>
            {industries.map((ind) => (
              <option key={ind} value={ind}>
                {ind}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-[#f7f7f5] border border-[#d4d4d0] text-xs font-mono text-[#111111] focus:outline-none focus:border-[#111111] rounded-none cursor-pointer"
          >
            <option value="all">All Statuses</option>
            {statuses.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white border border-[#d4d4d0] overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-[#d4d4d0] bg-[#fafafa] text-[#666666] font-mono text-[11px]">
              <th className="py-3 px-4">COMPANY</th>
              <th className="py-3 px-4">WEBSITE</th>
              <th className="py-3 px-4">INDUSTRY</th>
              <th className="py-3 px-4">WEBSITE SCORE</th>
              <th className="py-3 px-4">OPPORTUNITY SCORE</th>
              <th className="py-3 px-4">STATUS</th>
              <th className="py-3 px-4 text-right">ACTION</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#d4d4d0] font-mono">
            {filteredLeads.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-[#666666] font-mono text-xs">
                  No target leads match the active filters.
                </td>
              </tr>
            ) : (
              filteredLeads.map((lead) => (
                <tr
                  key={lead.id}
                  className="hover:bg-[#f7f7f5]/70 transition-colors cursor-pointer"
                  onClick={() => setSelectedLead(lead)}
                >
                  <td className="py-3 px-4 font-bold text-[#111111] whitespace-nowrap">
                    <div>{lead.company}</div>
                    <div className="text-[10px] text-[#666666] font-normal">{lead.id}</div>
                  </td>
                  <td className="py-3 px-4 text-[#1a365d] whitespace-nowrap">
                    <span className="flex items-center gap-1 hover:underline">
                      <Globe size={11} />
                      {lead.website}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-[#555555] whitespace-nowrap font-sans">
                    {lead.industry}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <ScoreBadge score={lead.websiteScore} type="website" />
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <ScoreBadge score={lead.opportunityScore} type="opportunity" />
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <StatusBadge status={lead.status} size="sm" />
                  </td>
                  <td className="py-3 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedLead(lead)}
                    >
                      Audit Details
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selectedLead && (
        <LeadDetailModal
          lead={selectedLead}
          isOpen={!!selectedLead}
          onClose={() => setSelectedLead(null)}
        />
      )}
    </div>
  );
};
