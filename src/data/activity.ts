import { ActivityItem } from "./types";

export const MOCK_ACTIVITY: ActivityItem[] = [
  {
    id: "act-01",
    timestamp: "2026-08-29 10:45:30",
    timeAgo: "Just now",
    agentId: "agent-developer",
    agentName: "Developer Agent",
    type: "agent_action",
    title: "Generated Pricing Section Component",
    description: "Synthesized responsive tiered pricing card component for Apex Logistics redesign demo.",
    level: "info",
    environment: "LEGACY_TEST",
    metadata: {
      taskId: "TSK-1048",
      linesOfCode: 142,
      framework: "Next.js / Tailwind"
    }
  },
  {
    id: "act-02",
    timestamp: "2026-08-29 10:44:12",
    timeAgo: "2m ago",
    agentId: "agent-sales",
    agentName: "Sales Agent",
    type: "approval_event",
    title: "Approval Requested: Outreach Email",
    description: "Submitted approval request APR-201 for outbound pitch email to NexaHealth CMO.",
    level: "warning",
    environment: "LEGACY_TEST",
    metadata: {
      approvalId: "APR-201",
      riskLevel: "high",
      recipient: "d.reynolds@apexlogistics-demo.com"
    }
  },
  {
    id: "act-03",
    timestamp: "2026-08-29 10:41:05",
    timeAgo: "5m ago",
    agentId: "agent-research",
    agentName: "Research Agent",
    type: "lead_event",
    title: "New High-Value Lead Discovered",
    description: "Identified Apex Logistics LLC (Opportunity Score: 94/100, Est. Deal: $4,500).",
    level: "success",
    environment: "LEGACY_TEST",
    metadata: {
      leadId: "LEAD-001",
      websiteScore: 38,
      industry: "Transportation & Logistics"
    }
  },
  {
    id: "act-04",
    timestamp: "2026-08-29 10:35:18",
    timeAgo: "11m ago",
    agentId: "agent-analyst",
    agentName: "Website Analyst",
    type: "task_lifecycle",
    title: "Completed Lighthouse Audit: NexaHealth",
    description: "Audit recorded Mobile Score 42/100, LCP 4.8s, Cumulative Layout Shift 0.38.",
    level: "info",
    environment: "LEGACY_TEST",
    metadata: {
      taskId: "TSK-1040",
      mobileScore: 42,
      desktopScore: 68
    }
  },
  {
    id: "act-05",
    timestamp: "2026-08-29 10:32:00",
    timeAgo: "14m ago",
    agentId: "agent-developer",
    agentName: "Developer Agent",
    type: "approval_event",
    title: "Approval Requested: Subdomain Deployment",
    description: "Submitted approval request APR-202 for public staging preview on bluewave.clientdemos.co.",
    level: "warning",
    environment: "LEGACY_TEST",
    metadata: {
      approvalId: "APR-202",
      riskLevel: "medium"
    }
  },
  {
    id: "act-06",
    timestamp: "2026-08-29 10:20:45",
    timeAgo: "25m ago",
    agentId: "agent-ceo",
    agentName: "CEO Agent",
    type: "agent_action",
    title: "Prioritized Daily Queue Focus",
    description: "Re-allocated priority weight toward Home Services & Contracting leads with website score < 40.",
    level: "info",
    environment: "LEGACY_TEST",
    metadata: {
      targetLeadsInQueue: 18,
      adjustedPriority: "high"
    }
  },
  {
    id: "act-07",
    timestamp: "2026-08-29 09:44:30",
    timeAgo: "1h 1m ago",
    agentId: "agent-analyst",
    agentName: "Website Analyst",
    type: "task_lifecycle",
    title: "Task Completed: TSK-1040",
    description: "Technical audit for Summit Financial Group saved to Lead database.",
    level: "success",
    environment: "LEGACY_TEST",
    metadata: {
      duration: "4m 30s",
      lead: "Summit Financial Group"
    }
  },
  {
    id: "act-08",
    timestamp: "2026-08-29 08:15:20",
    timeAgo: "2h 30m ago",
    agentId: "agent-research",
    agentName: "Research Agent",
    type: "system_alert",
    title: "Scrape Task Failed: Cascade Dental",
    description: "Encountered HTTP 403 bot challenge. Safely parked task without violating rate policies.",
    level: "error",
    environment: "LEGACY_TEST",
    metadata: {
      taskId: "TSK-1038",
      errorCode: "HTTP_403_CHALLENGE"
    }
  },
  {
    id: "act-09",
    timestamp: "2026-08-29 08:00:00",
    timeAgo: "2h 45m ago",
    agentId: "agent-ceo",
    agentName: "CEO Agent",
    type: "system_alert",
    title: "Daily Autonomous Cluster Initialized",
    description: "All 5 operational agents spawned and healthy. Cluster health: 100%.",
    level: "success",
    environment: "LEGACY_TEST",
    metadata: {
      activeAgents: 5,
      budgetLimit: "$100.00"
    }
  }
];
