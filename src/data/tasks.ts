import { Task } from "./types";

export const INITIAL_TASKS: Task[] = [
  {
    id: "TSK-1001",
    title: "Generate Next.js Landing Page Mockup for Apex Logistics",
    description: "Synthesize high-conversion hero section, responsive booking widget, and pricing table using Tailwind CSS.",
    type: "Mockup Dev",
    status: "completed",
    priority: "high",
    assignedAgentId: "agent-developer",
    targetLeadId: "LEAD-001",
    input: {
      framework: "Next.js 16 / Tailwind",
      targetUrl: "apexlogistics-demo.com",
      keyIssuesFound: ["LCP 5.2s", "No Mobile Viewport", "Flash Asset Warning"]
    },
    output: null,
    createdAt: "2026-08-29T02:30:00.000Z",
    startedAt: "2026-08-29T02:42:15.000Z",
    environment: "LEGACY_TEST",
    archived: true
  },
  {
    id: "TSK-1002",
    title: "Deep Crawl Chicago Dental Practices Directory",
    description: "Extract 45 SMB domain candidates with HTTP status 200 and mobile viewport checks.",
    type: "Lead Discovery",
    status: "completed",
    priority: "medium",
    assignedAgentId: "agent-research",
    targetLeadId: "LEAD-002",
    input: {
      directoryUrl: "illinoishealthcare-directory.gov/dental",
      concurrency: 2,
      maxItems: 45
    },
    output: null,
    createdAt: "2026-08-29T02:25:00.000Z",
    startedAt: "2026-08-29T02:38:00.000Z",
    environment: "LEGACY_TEST",
    archived: true
  },
  {
    id: "TSK-1003",
    title: "Dispatch Cold Pitch Email to NexaHealth CMO",
    description: "Send tailored audit report highlighting 4.8s mobile load time and offering free interactive mockup.",
    type: "Outreach",
    status: "completed",
    priority: "critical",
    assignedAgentId: "agent-sales",
    targetLeadId: "LEAD-002",
    input: {
      recipient: "sarah.jenkins@nexahealthcare-sample.org",
      subject: "Website UX Audit & Mobile Performance Proposal for NexaHealth",
      auditSummary: "Mobile Score 42/100, LCP 4.8s"
    },
    output: {
      draftEmailPreview: "Hi Sarah, our automated analyzer detected severe mobile layout issues on your patient booking page...",
      spamScore: 0.1
    },
    createdAt: "2026-08-29T02:15:00.000Z",
    startedAt: "2026-08-29T02:20:00.000Z",
    environment: "LEGACY_TEST",
    archived: true
  },
  {
    id: "TSK-1004",
    title: "Deploy Public Vercel Demo for BlueWave Solar",
    description: "Publish interactive calculator preview to staging sub-domain for client review.",
    type: "Mockup Dev",
    status: "completed",
    priority: "high",
    assignedAgentId: "agent-developer",
    targetLeadId: "LEAD-003",
    input: {
      subdomain: "bluewave.clientdemos.co",
      buildArtifact: "dist/bluewave-prototype.tar.gz"
    },
    output: null,
    createdAt: "2026-08-29T02:10:00.000Z",
    startedAt: "2026-08-29T02:15:00.000Z",
    environment: "LEGACY_TEST",
    archived: true
  },
  {
    id: "TSK-1005",
    title: "Performance & Accessibility Audit: Horizon Legal",
    description: "Run Lighthouse CLI audit, check WCAG 2.1 AA compliance, and evaluate quote-form UX.",
    type: "Site Audit",
    status: "completed",
    priority: "medium",
    assignedAgentId: "agent-analyst",
    targetLeadId: "LEAD-004",
    input: {
      targetUrl: "horizonlegal-demo.net",
      viewportCheck: true,
      wcagLevel: "AA"
    },
    output: null,
    createdAt: "2026-08-29T02:40:00.000Z",
    environment: "LEGACY_TEST",
    archived: true
  },
  {
    id: "TSK-1006",
    title: "Extract Executive Contacts for Vanguard Precision",
    description: "Lookup verified email addresses for VP of Operations and Managing Director.",
    type: "Lead Discovery",
    status: "completed",
    priority: "low",
    assignedAgentId: "agent-research",
    targetLeadId: "LEAD-007",
    input: {
      companyName: "Vanguard Precision Machining",
      domain: "vanguardprecision-mock.com"
    },
    output: null,
    createdAt: "2026-08-29T02:45:00.000Z",
    environment: "LEGACY_TEST",
    archived: true
  },
  {
    id: "TSK-1007",
    title: "Synthesize Competitive Agency Pricing Report",
    description: "Compare redesign pricing tiers against 5 regional agency competitors for Austin SMBs.",
    type: "Executive Strategy",
    status: "completed",
    priority: "medium",
    assignedAgentId: "agent-ceo",
    input: {
      marketRegion: "Austin, TX",
      serviceCategory: "SMB Website Modernization"
    },
    output: null,
    createdAt: "2026-08-29T02:50:00.000Z",
    environment: "LEGACY_TEST",
    archived: true
  },
  {
    id: "TSK-1008",
    title: "Full Technical Audit for Summit Financial Group",
    description: "Completed comprehensive site benchmark: detected 31/100 mobile score and outdated WordPress 5.2 installation.",
    type: "Site Audit",
    status: "completed",
    priority: "high",
    assignedAgentId: "agent-analyst",
    targetLeadId: "LEAD-005",
    input: {
      targetUrl: "summitfinancial-mock.com"
    },
    output: {
      auditScore: 46,
      identifiedVulnerabilities: 3,
      reportUri: "reports/summit-financial-audit.json"
    },
    createdAt: "2026-08-29T01:30:00.000Z",
    startedAt: "2026-08-29T01:40:00.000Z",
    completedAt: "2026-08-29T01:44:30.000Z",
    environment: "LEGACY_TEST",
    archived: true
  },
  {
    id: "TSK-1009",
    title: "B2B Lead Discovery: Austin HVAC Contractors",
    description: "Identified 32 qualified businesses with revenues over $1.5M and websites older than 5 years.",
    type: "Lead Discovery",
    status: "completed",
    priority: "high",
    assignedAgentId: "agent-research",
    targetLeadId: "LEAD-006",
    input: {
      region: "Austin Metro",
      industry: "Home Services & Contracting"
    },
    output: {
      leadsDiscovered: 32,
      savedToDatabase: true
    },
    createdAt: "2026-08-29T00:30:00.000Z",
    startedAt: "2026-08-29T00:35:00.000Z",
    completedAt: "2026-08-29T00:52:00.000Z",
    environment: "LEGACY_TEST",
    archived: true
  },
  {
    id: "TSK-1010",
    title: "Scrape Legacy Booking Flow: Cascade Dental",
    description: "Target server returned HTTP 403 Cloudflare Bot Challenge after 3 retries.",
    type: "Site Audit",
    status: "failed",
    priority: "medium",
    assignedAgentId: "agent-research",
    input: {
      url: "https://cascadedental.mock/book"
    },
    output: null,
    error: "HTTP_403_BOT_CHALLENGE: Target blocked automated client scraper after 3 attempts.",
    createdAt: "2026-08-29T00:10:00.000Z",
    startedAt: "2026-08-29T00:12:00.000Z",
    completedAt: "2026-08-29T00:15:20.000Z",
    environment: "LEGACY_TEST",
    archived: true
  }
];