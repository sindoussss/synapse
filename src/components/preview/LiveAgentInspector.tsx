'use client';

import React, { useState } from 'react';
import { 
  Bot, Terminal, Shield, CheckCircle2, ChevronLeft, ChevronRight, 
  Activity, ArrowUpRight, Cpu, Layers, Radio
} from 'lucide-react';
import Link from 'next/link';

export function LiveAgentInspector({
  projectName = "Simulation With Daniel",
  projectId = "PRJ-SIMDANIEL-01"
}: {
  projectName?: string;
  projectId?: string;
}) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <>
      {/* Floating Toggle Button (Always visible on left) */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 left-6 z-50 bg-black text-white border border-neutral-700 px-3.5 py-2 text-xs font-mono uppercase tracking-widest flex items-center gap-2 shadow-2xl hover:bg-neutral-900 transition-all cursor-pointer"
        title="Toggle Synapse Live Agent Operations HUD"
      >
        <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
        <span>{isOpen ? "Hide Agent Console" : "Live Agent Console"}</span>
      </button>

      {/* Dockable Agent Operations Sidebar (Left) */}
      {isOpen && (
        <aside className="fixed top-0 bottom-0 left-0 z-40 w-80 bg-black/95 text-white border-r border-neutral-800 backdrop-blur-xl flex flex-col p-6 space-y-6 overflow-y-auto shadow-2xl transition-all font-mono">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold tracking-widest uppercase">Synapse Ops</span>
                <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800 px-1.5 py-0.5">
                  LIVE
                </span>
              </div>
              <p className="text-[11px] text-neutral-400">Agent Multi-Model Runtime</p>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-neutral-500 hover:text-white p-1"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>

          {/* Project & Client Context */}
          <div className="bg-neutral-950 border border-neutral-800 p-3 space-y-1 text-xs">
            <div className="text-neutral-500 text-[10px] uppercase">Active Target</div>
            <div className="font-bold text-white truncate">{projectName}</div>
            <div className="text-[10px] text-neutral-400 flex justify-between pt-1">
              <span>{projectId}</span>
              <span className="text-emerald-400">QA Pass (95/100)</span>
            </div>
          </div>

          {/* Live Agent Fleet Doings */}
          <div className="space-y-3 flex-1">
            <div className="text-[10px] uppercase tracking-widest text-neutral-500">
              Agent Doings & Status
            </div>

            {/* 1. Developer (Gemma) */}
            <div className="border border-neutral-800 bg-neutral-950/60 p-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-neutral-400" />
                  Agent Developer
                </span>
                <span className="text-[9px] border border-neutral-700 px-1 text-neutral-300">
                  Gemma 12B
                </span>
              </div>
              <p className="text-[11px] text-neutral-300">
                Authoring Next.js 16 + React 19 particle solver component.
              </p>
              <div className="text-[10px] text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Active Synthesis (Localhost GPU)
              </div>
            </div>

            {/* 2. Supervisor (Qwen 3.8 27B) */}
            <div className="border border-neutral-800 bg-neutral-950/60 p-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-neutral-400" />
                  Supervisor Agent
                </span>
                <span className="text-[9px] border border-neutral-700 px-1 text-neutral-300 font-bold">
                  Qwen 27B
                </span>
              </div>
              <p className="text-[11px] text-neutral-300">
                Architectural blueprinting, AST audit & Swiss monochrome enforcement.
              </p>
              <div className="text-[10px] text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Nominal (520 tok/s)
              </div>
            </div>

            {/* 3. Analyst (QA) */}
            <div className="border border-neutral-800 bg-neutral-950/60 p-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-neutral-400" />
                  Agent Analyst
                </span>
                <span className="text-[9px] border border-neutral-700 px-1 text-neutral-300">
                  Llama 3.2
                </span>
              </div>
              <p className="text-[11px] text-neutral-300">
                Continuous deterministic code safety & accessibility audit.
              </p>
              <div className="text-[10px] text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Zero Vulnerabilities Detected
              </div>
            </div>
          </div>

          {/* Quick Navigation Footer */}
          <div className="border-t border-neutral-800 pt-4 space-y-2 text-xs">
            <Link
              href="/"
              className="w-full py-2 px-3 border border-neutral-700 hover:bg-neutral-900 text-white flex items-center justify-between text-[11px] uppercase tracking-wider transition-colors"
            >
              <span>Operations Console</span>
              <ArrowUpRight className="w-3 h-3" />
            </Link>
            <Link
              href="/tasks"
              className="w-full py-2 px-3 border border-neutral-800 hover:bg-neutral-900 text-neutral-400 hover:text-white flex items-center justify-between text-[11px] uppercase tracking-wider transition-colors"
            >
              <span>Task Queue</span>
              <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
        </aside>
      )}
    </>
  );
}
