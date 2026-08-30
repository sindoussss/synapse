import { Approval } from "./types";

export const MOCK_APPROVALS: Approval[] = [
  {
    id: "APR-201",
    action: "Send Cold Email Campaign: Apex Logistics",
    riskLevel: "high",
    reason: "Outbound communication to verified VP with redesign preview link. Requires operator check to ensure pitch compliance and tone.",
    requestedByAgent: "Sales Agent",
    requestedByAgentId: "agent-sales",
    targetEntity: "d.reynolds@apexlogistics-demo.com",
    status: "approved", environment: "LEGACY_TEST",
    timestamp: "10:44 AM (12m ago)",
    expiresIn: "3h 48m",
    details: {
      description: "Personalized outreach email with attached 3-page site performance audit & link to interactive Next.js hero mockup.",
      payloadPreview: {
        recipient: "d.reynolds@apexlogistics-demo.com",
        subject: "Quick question regarding Apex Logistics mobile page speed (38/100)",
        previewUrl: "https://preview.autonomousops.internal/apex-logistics",
        complianceFilter: "Passed CAN-SPAM + One-Click Unsubscribe Header included"
      },
      estimatedCost: "$0.002 (Email Relay)",
      safetyChecksPassed: [
        "Verified recipient MX domain",
        "Zero hallucinated factual claims",
        "Unsubscribe link inserted"
      ]
    }
  },
  {
    id: "APR-202",
    action: "Deploy Public Vercel Demo Subdomain",
    riskLevel: "medium",
    reason: "Publishing live static prototype to 'bluewave.clientdemos.co' for client stakeholder review. Public DNS record creation requested.",
    requestedByAgent: "Developer Agent",
    requestedByAgentId: "agent-developer",
    targetEntity: "BlueWave Solar Prototype (Next.js 16 + Tailwind)",
    status: "approved", environment: "LEGACY_TEST",
    timestamp: "10:32 AM (24m ago)",
    expiresIn: "5h 28m",
    details: {
      description: "Automated deployment of synthesized modern landing page with solar ROI calculator component.",
      payloadPreview: {
        buildFramework: "Next.js 16.3 / React 19",
        targetDomain: "bluewave.clientdemos.co",
        assetSizeTotal: "412 KB",
        sslCertificate: "Auto-provisioned Let's Encrypt"
      },
      estimatedCost: "$0.00 (Vercel Free Tier)",
      safetyChecksPassed: [
        "No API keys leaked in client bundles",
        "HTML validator passed (0 errors)",
        "Accessibility score: 98/100"
      ]
    }
  },
  {
    id: "APR-203",
    action: "Elevate Crawler Rate Limit for Illinois Dental Board",
    riskLevel: "critical",
    reason: "Research Agent requests increasing request concurrency from 2 req/sec to 10 req/sec to process 120 regional practices faster.",
    requestedByAgent: "Research Agent",
    requestedByAgentId: "agent-research",
    targetEntity: "Directory: illinoishealthcare-directory.gov/dental",
    status: "approved", environment: "LEGACY_TEST",
    timestamp: "10:15 AM (41m ago)",
    expiresIn: "1h 19m",
    details: {
      description: "Batch crawling directory entries to extract address, current web address, and practice owner names.",
      payloadPreview: {
        targetHost: "illinoishealthcare-directory.gov",
        currentRateLimit: "2 req/s",
        requestedRateLimit: "10 req/s",
        estimatedDuration: "14 minutes"
      },
      estimatedCost: "$0.45 (Proxy Bandwidth)",
      safetyChecksPassed: [
        "Robots.txt crawl-delay inspected",
        "Rotating residential proxies enabled"
      ]
    }
  },
  {
    id: "APR-204",
    action: "Allocate $50 AI Budget for Deep Heuristic Code Audits",
    riskLevel: "low",
    reason: "CEO Agent requests temporary budget allocation expansion from $100 to $150 for multi-model code critique benchmarking.",
    requestedByAgent: "CEO Agent",
    requestedByAgentId: "agent-ceo",
    targetEntity: "Model Pool: Claude 3.7 Sonnet + GPT-4o",
    status: "approved", environment: "LEGACY_TEST",
    timestamp: "09:58 AM (58m ago)",
    expiresIn: "11h 02m",
    details: {
      description: "Increase daily inference budget to run parallel semantic code analysis on 10 high-value target websites.",
      payloadPreview: {
        currentDailyBudget: "$100.00",
        requestedDailyBudget: "$150.00",
        remainingMonthlyBudget: "$1,420.00"
      },
      estimatedCost: "$50.00",
      safetyChecksPassed: [
        "Within monthly organization ceiling ($2,000)",
        "Cost per lead estimated at $1.25 (ROI > 80x)"
      ]
    }
  }
];
