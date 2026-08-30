// Application Domain Types

export type AgentStatus = "active" | "idle" | "running" | "waiting_approval" | "error";

export interface Agent {
  id: string;
  name: string;
  role: string;
  status: AgentStatus;
  currentTask: string;
  model: string;
  tasksCompleted: number;
  uptime: string;
  lastActive: string;
  capabilities: string[];
  efficiencyRate: number;
}

export type TaskStatus = 
  | "queued" 
  | "running" 
  | "waiting_approval" 
  | "completed" 
  | "failed";

export type TaskPriority = "low" | "medium" | "high" | "critical";

export type TaskType = 
  | "Lead Discovery" 
  | "Site Audit" 
  | "Mockup Dev" 
  | "Outreach" 
  | "lead_discovery"
  | "site_audit"
  | "mockup_dev"
  | "outreach"
  | string;

export type OperationalEnvironment = 
  | "LIVE_REAL" 
  | "CONTROLLED_TEST" 
  | "CONTROLLED_TEST_EXTERNAL_EFFECT" 
  | "SYNTHETIC" 
  | "SIMULATION" 
  | "DEMO" 
  | "LEGACY_TEST"
  | "UNCLASSIFIED";

export interface Task {
  id: string;
  title: string;
  description: string;
  type: TaskType;
  status: TaskStatus;
  priority: TaskPriority;
  assignedAgentId: string;
  targetLeadId?: string;
  parentTaskId?: string;
  input?: Record<string, any> | null;
  output?: Record<string, any> | null;
  error?: string | null;
  createdAt: string;
  startedAt?: string | null;
  completedAt?: string | null;
  environment?: OperationalEnvironment;
  archived?: boolean;
}

export interface TaskCreateInput {
  title: string;
  description: string;
  type: TaskType;
  priority?: TaskPriority;
  assignedAgentId: string;
  status?: TaskStatus;
  targetLeadId?: string;
  parentTaskId?: string;
  input?: Record<string, any> | null;
  environment?: OperationalEnvironment;
}

export interface TaskUpdateInput {
  title?: string;
  description?: string;
  type?: TaskType;
  status?: TaskStatus;
  priority?: TaskPriority;
  assignedAgentId?: string;
  targetLeadId?: string;
  parentTaskId?: string;
  input?: Record<string, any> | null;
  output?: Record<string, any> | null;
  error?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  environment?: OperationalEnvironment;
  archived?: boolean;
}

export type LeadStatus = 
  | "Discovered" 
  | "Audited" 
  | "Mockup Ready" 
  | "Outreach Pending" 
  | "Outreach Ready"
  | "Contacted" 
  | "Replied"
  | "Interested"
  | "Meeting Requested"
  | "Not Interested"
  | "Do Not Contact"
  | "Qualified" 
  | "Closed Won" 
  | "Unresponsive"
  | "replied"
  | "interested"
  | "meeting_requested"
  | "not_interested"
  | "do_not_contact"
  | "outreach_ready";

export interface Lead {
  id: string;
  company: string;
  website: string;
  industry: string;
  websiteScore: number;
  opportunityScore: number;
  status: LeadStatus;
  detectedIssues: string[];
  contactEmail?: string;
  estimatedDealValue: string;
  discoveredAt: string;
  techStack?: string[];
  location?: string;
  sourceUrl?: string;
  sourceType?: string;
  discoveredByAgentId?: string;
  environment?: OperationalEnvironment;
}

export interface LeadCreateInput {
  company: string;
  website: string;
  industry: string;
  location?: string;
  websiteScore?: number;
  opportunityScore?: number;
  status?: LeadStatus;
  notes?: string;
  detectedIssues?: string[];
  sourceUrl?: string;
  sourceType?: string;
  discoveredByAgentId?: string;
  environment?: OperationalEnvironment;
}

export type RiskLevel = "low" | "medium" | "high" | "critical";
export type ApprovalStatus = "pending" | "approved" | "rejected";

export interface Approval {
  id: string;
  action: string;
  riskLevel: RiskLevel;
  reason: string;
  requestedByAgent: string;
  requestedByAgentId: string;
  targetEntity: string;
  status: ApprovalStatus;
  timestamp: string;
  expiresIn?: string;
  details: {
    description: string;
    payloadPreview: Record<string, any>;
    estimatedCost?: string;
    safetyChecksPassed?: string[];
  };
  environment?: OperationalEnvironment;
}

export type ActivityLevel = "info" | "success" | "warning" | "error";
export type ActivityType = 
  | "task_created" 
  | "task_started" 
  | "task_reassigned" 
  | "task_status_changed" 
  | "task_completed" 
  | "task_failed" 
  | "task_deleted" 
  | "task_lifecycle"
  | "agent_action" 
  | "approval_event" 
  | "lead_event" 
  | "system_alert"
  | "inbound_reply_detected";

export interface ActivityItem {
  id: string;
  timestamp: string;
  timeAgo: string;
  agentId?: string;
  agentName: string;
  type: ActivityType;
  title: string;
  description: string;
  level: ActivityLevel;
  metadata?: Record<string, string | number | boolean | null | undefined>;
  environment?: OperationalEnvironment;
}

export interface AIProviderSetting {
  id: string;
  name: string;
  provider: string;
  model: string;
  status: "connected" | "unconfigured" | "rate_limited";
  keyMask: string;
  latencyMs: number;
  tokenUsageToday: number;
  costToday: string;
}

export interface BudgetSettings {
  monthlyCapUsd: number;
  dailyLimitUsd: number;
  currentMonthlySpendUsd: number;
  currentDailySpendUsd: number;
  autoKillSwitchActive: boolean;
  costPerLeadAverageUsd: number;
  emergencyAlertEmail: string;
}

export interface ApprovalRulesSettings {
  autoApproveLowRisk: boolean;
  requireReviewForOutreach: boolean;
  maxAutonomousSpendPerActionUsd: number;
  notifyOnCriticalRisk: boolean;
  requireDualConfirmationForDeletions: boolean;
  maxDailyOutreachEmails: number;
}

export interface BusinessSettings {
  businessName: string;
  businessDomain: string;
  targetIndustries: string[];
  dailyLeadTarget: number;
  outreachHours: string;
  timezone: string;
  primaryOffer: string;
}