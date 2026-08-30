"use client";

import { PAPER, TOC } from "@/lib/research/catalog";

export function ResearchNav() {
  return (
    <aside className="research-sidebar">
      <a className="research-wordmark" href="#top">
        SYNAPSE
      </a>
      <p className="sidebar-kicker">Contents</p>
      <nav className="toc" aria-label="Table of contents">
        {TOC.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className={item.level === 2 ? "toc-sub" : "toc-item"}
          >
            <span className="toc-n">{item.n}</span>
            <span className="toc-label">{item.label}</span>
          </a>
        ))}
      </nav>
      <div className="sidebar-aside">
        {PAPER.repositoryUrl ? (
          <a href={PAPER.repositoryUrl} rel="noreferrer">
            GitHub
          </a>
        ) : (
          <span title="Repository URL has not been published in this workspace">GitHub — not published</span>
        )}
        <button type="button" onClick={() => window.print()}>
          Print / PDF
        </button>
      </div>
    </aside>
  );
}
