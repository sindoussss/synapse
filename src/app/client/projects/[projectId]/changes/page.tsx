'use client';
import React, { useState } from 'react';
import Link from 'next/link';

export default function ChangeRequestsPage({ params }: { params: { projectId: string } }) {
  const projectId = params?.projectId || 'PRJ-SINDOUS-01';
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('MEDIUM');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description) return;
    setSubmitted(true);
    setDescription('');
  };

  return (
    <div className="text-[#111] p-6 md:p-10 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center gap-2 text-xs text-[#666666]">
          <Link href={`/client/projects/${projectId}`} className="hover:text-[#222222]">
            ← Project Overview
          </Link>
          <span>/</span>
          <span className="text-[#222222] font-medium">Change Requests</span>
        </div>

        <header className="border-b border-[#d4d4d0] pb-4">
          <h1 className="text-2xl font-bold text-[#111111]">Submit a Change Request</h1>
          <p className="text-xs text-[#666666] mt-1">
            All submitted changes enter our formal requirement intelligence and deterministic QA pipeline.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="bg-white/60 border border-[#d4d4d0] rounded-xl p-6 space-y-4">
          <div>
            <label className="text-xs font-semibold text-[#333333] block mb-1">Change Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the requested feature modification or layout adjustment..."
              rows={4}
              className="w-full bg-white border border-[#d4d4d0] rounded-lg p-3 text-xs text-[#222222] focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-[#333333] block mb-1">Priority Level</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as any)}
              className="bg-white border border-[#d4d4d0] rounded-lg p-2 text-xs text-[#222222]"
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="CRITICAL">Critical</option>
            </select>
          </div>

          <button
            type="submit"
            className="bg-emerald-600 hover:bg-emerald-500 text-[#111111] text-xs font-semibold px-5 py-2.5 rounded-lg transition"
          >
            Submit Formal Change Request
          </button>

          {submitted && (
            <p className="text-xs text-emerald-400 mt-2">
              ✓ Change request submitted successfully (Status: SUBMITTED). Production remains unmodified until authorized.
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
