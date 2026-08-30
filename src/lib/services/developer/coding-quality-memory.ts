/**
 * SYNAPSE CODING QUALITY MEMORY
 * Reusable engineering references for high-craft TypeScript, React, Tailwind, responsive design,
 * accessibility (a11y), and anti-AI-slop design heuristics.
 */

export interface EngineeringStandard {
  category: string;
  principles: string[];
  antiPatternsToAvoid: string[];
  recommendedPatterns: string[];
}

export const CODING_QUALITY_MEMORY: Record<string, EngineeringStandard> = {
  react_typescript: {
    category: "React & TypeScript Architecture",
    principles: [
      "Modular single-responsibility components with strict TypeScript interface props.",
      "Explicit state machines and immutable state updates without uncontrolled side-effects.",
      "Fail-safe error boundaries and deterministic fallback UI for missing data.",
      "Preservation of existing file structures and zero destructive rewrites.",
    ],
    antiPatternsToAvoid: [
      "Giant 2000-line single-file pages with inline components.",
      "Using 'any' or untyped props in public components.",
      "Uncontrolled side effects and memory leaks in useEffect.",
      "Overwriting existing working components during minor feature updates.",
    ],
    recommendedPatterns: [
      "Split layouts into Header, Hero, ProductGrid, LiveEstimator, ContactForm.",
      "Type every prop interface and export domain data types.",
      "Use custom hooks for complex business logic (e.g. quote calculator, filter state).",
    ],
  },
  visual_design_anti_slop: {
    category: "Visual Craft & Anti-AI-Slop Guidelines",
    principles: [
      "Ground typography, color palettes, and imagery in specific industry vernacular (e.g., slate/emerald/amber for heavy construction; not glowing cyberpunk for cement).",
      "Prioritize content hierarchy, functional whitespace, contrast ratios, and scannable information density.",
      "Never generate generic marketing filler like '99.9% Super Satisfied Clients' or fake award badges.",
    ],
    antiPatternsToAvoid: [
      "Generic purple-to-cyan neon gradients on corporate/industrial websites.",
      "Excessive backdrop-blur glassmorphism cards that obscure text legibility.",
      "Floating colorful glowing blobs that serve no UI purpose.",
      "Identical 3-card grid feature sections with generic stock icons.",
      "Fake testimonials with generated stock portrait names.",
      "Excessive bouncing and floating CSS animations.",
    ],
    recommendedPatterns: [
      "High-contrast slate/zinc neutrals with restrained functional accents.",
      "Subtle 1px border dividers (`border-slate-800` on dark or `border-slate-200` on light).",
      "Explicit data cards with actual domain units (e.g., '₱245 / 40kg bag', 'Grade 40 PNS').",
      "Clear visual hierarchy: Section Kicker -> H2 -> Concrete Value Prop -> Functional Tool.",
    ],
  },
  responsive_layout: {
    category: "Mobile-First Responsive Layouts",
    principles: [
      "Every interactive element and text container must adapt fluidly across all 5 standard viewports.",
      "Touch targets must meet minimum 44x44px requirements on mobile viewports.",
      "Zero horizontal layout overflow or clipped numerical values.",
    ],
    antiPatternsToAvoid: [
      "Fixed pixel widths (`w-[1200px]`) causing horizontal scrollbars on mobile.",
      "Unresponsive data tables that collapse illegibly on 375px screens.",
      "Sticky headers that consume more than 20% of vertical mobile viewport height.",
      "Tiny unclickable increment/decrement counter buttons on touchscreens.",
    ],
    recommendedPatterns: [
      "Mobile-first Tailwind classes: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`.",
      "Flexible scrollable category chips (`overflow-x-auto pb-1`).",
      "Sticky bottom mobile quotation summary or drawer for mobile purchasing workflows.",
    ],
  },
  accessibility_a11y: {
    category: "Accessibility (a11y) & Semantic Standards",
    principles: [
      "Full keyboard navigation with visible focus rings on all interactive controls.",
      "Explicit ARIA attributes, semantic HTML elements (<header>, <main>, <nav>, <section>, <form>), and label bindings (`htmlFor` / `id`).",
      "WCAG 2.1 AA color contrast ratio (minimum 4.5:1 for normal text).",
    ],
    antiPatternsToAvoid: [
      "Unlabeled icon-only buttons (`<button><X /></button>` without `aria-label`).",
      "Using `<div onClick=...>` instead of semantic `<button>`.",
      "Skipping heading levels (e.g. `<h1>` directly to `<h4>`).",
      "Low contrast placeholder text (e.g. gray-300 on white).",
    ],
    recommendedPatterns: [
      "Always attach `aria-label` or visible `<label>` to inputs, search boxes, and buttons.",
      "Use `focus-visible:ring-2 focus-visible:ring-emerald-500` for keyboard focus states.",
      "Use structured `<table>` or responsive definition lists for technical specifications.",
    ],
  },
};