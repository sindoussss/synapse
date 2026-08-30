import { designIntelligenceRepository, DesignSystemRecord, DesignBriefRecord } from "../../repositories/design-intelligence.repository";

export class DesignSystemEngine {
  async generateDesignSystem(brief: DesignBriefRecord): Promise<DesignSystemRecord> {
    const dsId = `DS-2026-${Math.floor(100000 + Math.random() * 900000)}`;
    const version = "DS-VERSION-000001";
    const now = new Date().toISOString();

    const ds: DesignSystemRecord = {
      id: dsId,
      version,
      designBriefId: brief.id,
      organizationId: brief.organizationId,
      projectId: brief.projectId,
      workspaceId: brief.workspaceId,
      environment: brief.environment,
      typographyScale: {
        xs: "0.75rem (12px) / line-height: 1rem",
        sm: "0.875rem (14px) / line-height: 1.25rem",
        base: "1rem (16px) / line-height: 1.5rem",
        lg: "1.125rem (18px) / line-height: 1.75rem",
        xl: "1.25rem (20px) / line-height: 1.75rem",
        "2xl": "1.5rem (24px) / line-height: 2rem",
        "3xl": "1.875rem (30px) / line-height: 2.25rem",
        "4xl": "2.25rem (36px) / line-height: 2.5rem",
      },
      fontFamilies: {
        sans: "Inter, system-ui, -apple-system, sans-serif",
        mono: "JetBrains Mono, Menlo, monospace",
        heading: "Inter, system-ui, sans-serif",
      },
      headingHierarchy: {
        h1: "text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight",
        h2: "text-xl sm:text-2xl font-bold text-white tracking-tight",
        h3: "text-sm sm:text-base font-semibold text-slate-100",
        h4: "text-xs font-bold uppercase tracking-wider text-slate-400",
      },
      bodyHierarchy: {
        base: "text-sm text-slate-300 leading-relaxed",
        small: "text-xs text-slate-400 leading-normal",
        muted: "text-[11px] text-slate-500",
      },
      spacingScale: {
        "1": "0.25rem (4px)",
        "2": "0.5rem (8px)",
        "3": "0.75rem (12px)",
        "4": "1rem (16px)",
        "6": "1.5rem (24px)",
        "8": "2rem (32px)",
        "12": "3rem (48px)",
      },
      borderRadiusPolicy: {
        card: "rounded-xl (12px) - Restrained architectural corners",
        button: "rounded-lg (8px) - Clean functional click zones",
        input: "rounded-lg (8px)",
        badge: "rounded-md (6px) or rounded-full (for category pills)",
      },
      shadowPolicy: {
        card: "shadow-sm border border-slate-800",
        dropdown: "shadow-lg bg-slate-900 border border-slate-800",
        modal: "shadow-2xl bg-slate-950 border border-slate-800",
      },
      colorTokens: {
        "brand-primary": "#059669 (Emerald 600)",
        "brand-primary-hover": "#10b981 (Emerald 500)",
        "brand-accent": "#0284c7 (Sky 600)",
        "brand-warning": "#d97706 (Amber 600)",
        "bg-base": "#020617 (Slate 950)",
        "bg-surface": "#0f172a (Slate 900)",
        "bg-elevated": "#1e293b (Slate 800)",
        "border-subtle": "#1e293b (Slate 800)",
        "border-strong": "#334155 (Slate 700)",
      },
      surfaceTokens: {
        background: "bg-slate-950",
        card: "bg-slate-900/90 border border-slate-800",
        header: "bg-slate-950/90 backdrop-blur border-b border-slate-800",
        calculator: "bg-slate-900 border border-slate-800 shadow-xl",
      },
      buttonStyles: {
        primary: "bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2.5 rounded-lg transition",
        secondary: "bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 px-3 py-1.5 rounded-lg",
        addQuote: "bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600 hover:text-white border border-emerald-500/30",
      },
      inputStyles: {
        text: "bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500",
        search: "bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500",
      },
      cardPolicy: {
        background: "bg-slate-900/80",
        border: "border border-slate-800",
        padding: "p-4 sm:p-5",
        radius: "rounded-xl",
      },
      containerWidths: {
        sm: "640px",
        md: "768px",
        lg: "1024px",
        xl: "1280px",
        "2xl": "1440px (max-w-7xl)",
      },
      responsiveBreakpoints: {
        sm: "640px",
        md: "768px",
        lg: "1024px",
        xl: "1280px",
      },
      gridStrategy: "12-column CSS Grid with gap-8 on lg viewports, collapsing to 1-column flex on sm/mobile viewports.",
      isImmutable: true,
      createdAt: now,
    };

    return await designIntelligenceRepository.saveDesignSystem(ds);
  }
}

export const designSystemEngine = new DesignSystemEngine();