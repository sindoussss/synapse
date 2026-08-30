import { SUITE_SIZES } from "@/lib/research/catalog";

export function SuiteSizeChart() {
  const max = Math.max(...SUITE_SIZES.map((row) => row.n));
  const height = 220;
  const pad = { t: 18, r: 8, b: 36, l: 28 };
  const w = 640;
  const innerW = w - pad.l - pad.r;
  const innerH = height - pad.t - pad.b;
  const gap = 4;
  const barW = innerW / SUITE_SIZES.length - gap;

  return (
    <figure className="figure">
      <div className="figure-head">Figure 9. Internal acceptance-suite sizes by phase</div>
      <svg
        className="chart"
        viewBox={`0 0 ${w} ${height}`}
        role="img"
        aria-label="Bar chart of internal test suite sizes from 20 to 40 cases per phase"
      >
        <defs>
          <pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="6" stroke="#1a365d" strokeWidth="2" />
          </pattern>
        </defs>
        {[0, 10, 20, 30, 40].map((tick) => {
          const y = pad.t + innerH - (tick / max) * innerH;
          return (
            <g key={tick}>
              <line x1={pad.l} x2={w - pad.r} y1={y} y2={y} stroke="#e5e5e5" />
              <text x={pad.l - 6} y={y + 3} textAnchor="end" fontSize="9" fill="#555">
                {tick}
              </text>
            </g>
          );
        })}
        {SUITE_SIZES.map((row, i) => {
          const h = (row.n / max) * innerH;
          const x = pad.l + i * (barW + gap);
          const y = pad.t + innerH - h;
          const hashed = row.phase === "48";
          return (
            <g key={row.phase}>
              <rect
                x={x}
                y={y}
                width={barW}
                height={h}
                fill={hashed ? "url(#hatch)" : "#4a6fa5"}
                stroke="#1a365d"
                strokeWidth={hashed ? 1 : 0}
              />
              <text x={x + barW / 2} y={y - 4} textAnchor="middle" fontSize="8" fill="#222">
                {row.n}
              </text>
              <text
                x={x + barW / 2}
                y={height - 10}
                textAnchor="middle"
                fontSize="8"
                fill="#555"
              >
                {row.phase}
              </text>
            </g>
          );
        })}
      </svg>
      <figcaption className="figure-cap">
        Sample size <em>n</em> of each in-repo suite (Phase 48 hatched, <em>n</em> = 20). These
        are engineering test counts, not model-accuracy scores and not a comparison against
        other coding systems.
      </figcaption>
    </figure>
  );
}

export function ConcurrencyChart() {
  const rows = [
    { label: "Global", v: 10 },
    { label: "Organization", v: 5 },
    { label: "Project", v: 3 },
  ];
  const max = 10;
  return (
    <figure className="figure">
      <div className="figure-head">Figure 10. Designed concurrency ceilings (Phase 58)</div>
      <svg className="chart" viewBox="0 0 420 160" role="img" aria-label="Horizontal bars for concurrency limits">
        {rows.map((row, i) => {
          const y = 22 + i * 42;
          const w = (row.v / max) * 280;
          return (
            <g key={row.label}>
              <text x="8" y={y + 14} fontSize="11" fill="#222">
                {row.label}
              </text>
              <rect x="110" y={y} width="280" height="22" fill="#f3f3f3" />
              <rect x="110" y={y} width={w} height="22" fill="#6b7280" />
              <text x={118 + w} y={y + 15} fontSize="11" fill="#111">
                {row.v}
              </text>
            </g>
          );
        })}
      </svg>
      <figcaption className="figure-cap">
        Configuration bounds from the Phase 58 worker runtime report: at most 10 concurrent
        workers globally, 5 per organization, and 3 per project. Not a measured load-test
        result.
      </figcaption>
    </figure>
  );
}

export function SamplePolicyChart() {
  const rows = [
    { n: "n = 0", label: "N/A", w: 40 },
    { n: "n = 1", label: "INSUFFICIENT_EVIDENCE", w: 120 },
    { n: "n ≥ 2", label: "OBSERVED / SUPPORTED", w: 200 },
  ];
  return (
    <figure className="figure">
      <div className="figure-head">Figure 11. Design-learning sample-size policy (Phase 54)</div>
      <svg className="chart" viewBox="0 0 520 150" role="img" aria-label="Sample size policy bars">
        {rows.map((row, i) => {
          const y = 18 + i * 40;
          return (
            <g key={row.n}>
              <text x="8" y={y + 16} fontSize="11" fill="#222">
                {row.n}
              </text>
              <rect x="80" y={y} width={row.w} height="22" fill={i === 2 ? "#4a6fa5" : "#c5cdd8"} />
              <text x={88 + row.w} y={y + 16} fontSize="11" fill="#222">
                {row.label}
              </text>
            </g>
          );
        })}
      </svg>
      <figcaption className="figure-cap">
        Statistical policy used by the design-learning engine. A single observation cannot
        promote a high-confidence design rule. Causal claims without a pre-registered
        experiment are rejected.
      </figcaption>
    </figure>
  );
}
