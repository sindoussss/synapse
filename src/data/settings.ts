import { 
  AIProviderSetting, 
  BudgetSettings, 
  ApprovalRulesSettings, 
  BusinessSettings 
} from "./types";

export const MOCK_AI_PROVIDERS: AIProviderSetting[] = [
  {
    id: "prov-gemini",
    name: "Google Gemini (Free Tier)",
    provider: "Google Cloud",
    model: "gemini-2.5-flash",
    status: "connected",
    keyMask: "AQ.••••••••••••••••••••",
    latencyMs: 190,
    tokenUsageToday: 0,
    costToday: "$0.00 (Free Tier)"
  },
  {
    id: "prov-groq",
    name: "Groq Cloud API",
    provider: "Groq",
    model: "llama-3.3-70b-versatile",
    status: "connected",
    keyMask: "gsk_••••••••••••••••••••",
    latencyMs: 110,
    tokenUsageToday: 0,
    costToday: "$0.00"
  },
  {
    id: "prov-ollama",
    name: "Ollama Localhost Daemon",
    provider: "Ollama Local",
    model: "llama3.2:latest",
    status: "connected",
    keyMask: "http://localhost:11434",
    latencyMs: 45,
    tokenUsageToday: 0,
    costToday: "$0.00 (Local Compute)"
  }
];

export const MOCK_BUDGET_SETTINGS: BudgetSettings = {
  monthlyCapUsd: 100,
  dailyLimitUsd: 10,
  currentMonthlySpendUsd: 0,
  currentDailySpendUsd: 0,
  autoKillSwitchActive: true,
  costPerLeadAverageUsd: 0,
  emergencyAlertEmail: "johncasili257@gmail.com"
};

export const MOCK_APPROVAL_RULES: ApprovalRulesSettings = {
  autoApproveLowRisk: true,
  requireReviewForOutreach: true,
  maxAutonomousSpendPerActionUsd: 0,
  notifyOnCriticalRisk: true,
  requireDualConfirmationForDeletions: true,
  maxDailyOutreachEmails: 10
};

export const MOCK_BUSINESS_SETTINGS: BusinessSettings = {
  businessName: "SYNAPSE Operations",
  businessDomain: "synapseops.ph",
  targetIndustries: ["Logistics & Transportation", "Clean Energy", "Healthcare", "Legal Services"],
  dailyLeadTarget: 10,
  outreachHours: "09:00 - 18:00",
  timezone: "Asia/Manila (PHT, UTC+8)",
  primaryOffer: "B2B SMB Website Modernization & Performance Optimization"
};