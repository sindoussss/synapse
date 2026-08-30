'use client';
import React, { useState } from 'react';
import Link from 'next/link';

export default function SupportMaintenancePage({ params }: { params: { projectId: string } }) {
  const projectId = params?.projectId || 'PRJ-SINDOUS-01';
  const [category, setCategory] = useState('BUG');
  const [subject, setSubject] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="text-[#111] p-6 md:p-10 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center gap-2 text-xs text-[#666666]">
          <Link href={`/client/projects/${projectId}`} className="hover:text-[#222222]">
            ← Project Overview
          </Link>
          <span>/</span>
          <span className="text-[#222222] font-medium">Support & Maintenance</span>
        </div>

        <header className="border-b border-[#d4d4d0] pb-4">
          <h1 className="text-2xl font-bold text-[#111111]">Support & Maintenance Center</h1>
          <p className="text-xs text-[#666666] mt-1">
            Request defect repairs, content updates, or technical assistance under your warranty plan.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="bg-white/60 border border-[#d4d4d0] rounded-xl p-6 space-y-4">
          <div>
            <label className="text-xs font-semibold text-[#333333] block mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="bg-white border border-[#d4d4d0] rounded-lg p-2 text-xs text-[#222222]"
            >
              <option value="BUG">Defect / Bug Report</option>
              <option value="CONTENT_UPDATE">Content Update</option>
              <option value="CONFIGURATION">Configuration / DNS</option>
              <option value="SUPPORT">General Support</option>
              <option value="SECURITY">Security Inquiry</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-[#333333] block mb-1">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Brief summary of the issue..."
              className="w-full bg-white border border-[#d4d4d0] rounded-lg p-2.5 text-xs text-[#222222]"
            />
          </div>

          <button
            type="submit"
            className="bg-emerald-600 hover:bg-emerald-500 text-[#111111] text-xs font-semibold px-5 py-2.5 rounded-lg transition"
          >
            Submit Support Request
          </button>

          {submitted && (
            <p className="text-xs text-emerald-400 mt-2">
              ✓ Support ticket created (Status: OPEN). Assigned to operator queue.
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
