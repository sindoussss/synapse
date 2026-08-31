'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, ExternalLink, Monitor, Tablet, Smartphone, 
  RotateCw, CheckCircle2, Shield, Eye, Sparkles, BarChart3
} from 'lucide-react';
import { DeveloperBenchmarkModal } from '@/components/preview/DeveloperBenchmarkModal';

const PREVIEW_PROJECTS = [
  {
    id: "PRJ-SIMDANIEL-01",
    name: "Simulation With Daniel",
    subtitle: "Applied Numerical Simulation & Computational Physics",
    slug: "ai-generated-daniel",
    engine: "Gemma 12B (Local GPU) + Qwen 3.8 27B (Supervisor)",
    qaScore: "98/100",
    status: "PRODUCTION READY",
  },
  {
    id: "PRJ-GEMMA-01",
    name: "Simulation With Daniel (Gemma Coded)",
    subtitle: "Multi-Model Local Gemma Coder + Qwen Supervisor",
    slug: "gemma-coded-daniel",
    engine: "Gemma 12B Coder (Local GPU) + Qwen Reviewer",
    qaScore: "96/100",
    status: "VERIFIED CANDIDATE",
  },
  {
    id: "PRJ-SINDOUS-01",
    name: "Sindous Building Systems",
    subtitle: "Commercial Architectural & Structural Engineering",
    slug: "sindous-building",
    engine: "Synapse Core Coder",
    qaScore: "92/100",
    status: "PORTFOLIO STAGING",
  },
];

type DeviceView = "desktop" | "tablet" | "mobile";

export default function LivePreviewStudioPage() {
  const [selectedProject, setSelectedProject] = useState(PREVIEW_PROJECTS[0]);
  const [device, setDevice] = useState<DeviceView>("desktop");
  const [key, setKey] = useState(0);
  const [showBenchmarks, setShowBenchmarks] = useState(false);

  const getFrameWidth = () => {
    switch (device) {
      case "mobile":
        return "max-w-[390px]";
      case "tablet":
        return "max-w-[768px]";
      case "desktop":
      default:
        return "w-full";
    }
  };

  const previewUrl = `/preview/${selectedProject.slug}`;

  return (
    <div className="min-h-screen bg-[#f5f5f7] text-[#111] flex flex-col font-sans">
      {/* Developer Benchmark Modal */}
      <DeveloperBenchmarkModal
        isOpen={showBenchmarks}
        onClose={() => setShowBenchmarks(false)}
        projectName={selectedProject.name}
      />

      {/* Top Staging Control Bar */}
      <header className="bg-white border-b border-[#e5e5e5] px-6 h-16 flex items-center justify-between sticky top-0 z-30 shadow-xs">
        {/* Left: Back & Project Selection */}
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#666] hover:text-[#111] transition-colors py-1.5 px-2.5 border border-[#e5e5e5] rounded hover:bg-[#fafafa]"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Operations Console</span>
          </Link>

          {/* Project Dropdown / Pills */}
          <div className="flex items-center gap-1 bg-[#f0f0f2] p-1 rounded-lg border border-[#e5e5e5]">
            {PREVIEW_PROJECTS.map((p) => {
              const isSelected = p.id === selectedProject.id;
              return (
                <button
                  key={p.id}
                  onClick={() => {
                    setSelectedProject(p);
                    setKey((k) => k + 1);
                  }}
                  className={`px-3 py-1.5 text-xs font-mono uppercase tracking-wider rounded transition-all cursor-pointer ${
                    isSelected
                      ? "bg-white text-[#111] shadow-xs font-bold"
                      : "text-[#666] hover:text-[#111]"
                  }`}
                >
                  {p.name.replace("Simulation With Daniel", "Simulation Daniel")}
                </button>
              );
            })}
          </div>
        </div>

        {/* Center: Device Viewport Switcher */}
        <div className="hidden md:flex items-center gap-1 bg-[#f0f0f2] p-1 rounded-lg border border-[#e5e5e5]">
          <button
            onClick={() => setDevice("desktop")}
            className={`p-1.5 rounded transition-all cursor-pointer ${
              device === "desktop" ? "bg-white text-[#111] shadow-xs" : "text-[#666] hover:text-[#111]"
            }`}
            title="Desktop View (100%)"
          >
            <Monitor className="w-4 h-4" />
          </button>
          <button
            onClick={() => setDevice("tablet")}
            className={`p-1.5 rounded transition-all cursor-pointer ${
              device === "tablet" ? "bg-white text-[#111] shadow-xs" : "text-[#666] hover:text-[#111]"
            }`}
            title="Tablet View (768px)"
          >
            <Tablet className="w-4 h-4" />
          </button>
          <button
            onClick={() => setDevice("mobile")}
            className={`p-1.5 rounded transition-all cursor-pointer ${
              device === "mobile" ? "bg-white text-[#111] shadow-xs" : "text-[#666] hover:text-[#111]"
            }`}
            title="Mobile View (390px)"
          >
            <Smartphone className="w-4 h-4" />
          </button>
          <button
            onClick={() => setKey((k) => k + 1)}
            className="p-1.5 text-[#666] hover:text-[#111] transition-all cursor-pointer"
            title="Refresh Live Preview"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Right: Benchmarks & Standalone Link */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowBenchmarks(true)}
            className="flex items-center gap-1.5 bg-[#f0f0f2] hover:bg-[#e5e5e5] text-[#111] px-3 py-1.5 text-xs font-mono uppercase tracking-wider rounded border border-[#e5e5e5] transition-colors cursor-pointer"
            title="View Developer Agent Benchmarks"
          >
            <BarChart3 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Benchmarks</span>
          </button>

          <div className="hidden lg:flex items-center gap-2 text-[11px] font-mono text-[#666]">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>QA PASS ({selectedProject.qaScore})</span>
          </div>

          <a
            href={previewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 bg-[#111] text-white hover:bg-[#333] px-3.5 py-1.5 text-xs font-mono uppercase tracking-wider rounded transition-colors"
          >
            <span>Open Standalone</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </header>

      {/* Main Interactive Live Preview Frame */}
      <main className="flex-1 p-4 sm:p-6 flex justify-center items-start overflow-auto">
        <div
          className={`w-full ${getFrameWidth()} transition-all duration-300 h-[calc(100vh-112px)] bg-white rounded-xl shadow-xl border border-[#e5e5e5] overflow-hidden flex flex-col`}
        >
          {/* Mock Browser URL Bar */}
          <div className="bg-[#fafafa] border-b border-[#e5e5e5] px-4 py-2 flex items-center justify-between text-xs font-mono text-[#666]">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-[#27c93f]"></span>
            </div>

            <div className="bg-white border border-[#e5e5e5] px-4 py-0.5 rounded text-[11px] text-[#444] font-medium tracking-wide">
              Synapse Live Previews
            </div>

            <div className="text-[10px] text-[#888] uppercase tracking-wider">
              {selectedProject.engine.split("(")[0].trim()}
            </div>
          </div>

          {/* Real Live Iframe Sandbox */}
          <iframe
            key={`${selectedProject.id}-${key}`}
            src={previewUrl}
            className="w-full flex-1 border-0 bg-white"
            title={`Live Preview - ${selectedProject.name}`}
          />
        </div>
      </main>
    </div>
  );
}
