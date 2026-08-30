"use client";

import React from "react";
import Link from "next/link";
import { ActivityItem } from "@/data/types";

interface RecentActivityWidgetProps {
  activities: ActivityItem[];
}

export const RecentActivityWidget: React.FC<RecentActivityWidgetProps> = ({ activities }) => {
  return (
    <section>
      <div className="flex items-baseline justify-between gap-4 pb-3 mb-2 border-b border-[#e5e5e5]">
        <h2 className="ops-display text-[22px] text-[#111]">
          Activity
        </h2>
        <Link href="/activity" className="text-[13px] text-[#111] underline underline-offset-4 decoration-[#ccc] hover:decoration-[#111]">
          Full log
        </Link>
      </div>

      <div className="max-h-[460px] overflow-y-auto">
        {activities.slice(0, 8).map((item) => (
          <div key={item.id} className="py-4 border-b border-[#f0f0f0]">
            <div className="flex items-baseline justify-between gap-3">
              <div className="text-[15px] text-[#111]">
                {item.title}
                <span className="ml-2 text-[13px] text-[#888]">{item.agentName}</span>
              </div>
              <span className="text-[12px] text-[#888] whitespace-nowrap">
                {item.timeAgo}
              </span>
            </div>
            <p className="mt-1 text-[14px] text-[#666] leading-relaxed">
              {item.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
};
