"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import { 
  Task, 
  TaskCreateInput, 
  TaskUpdateInput, 
  TaskStatus, 
  ActivityItem,
  Agent,
  Lead,
  Approval,
  AgentStatus,
  OperationalEnvironment 
} from "@/data/types";
import { taskService } from "@/lib/services/task.service";
import { activityRepository } from "@/lib/repositories/activity.repository";
import { agentRepository } from "@/lib/repositories/agent.repository";
import { leadRepository } from "@/lib/repositories/lead.repository";
import { approvalRepository } from "@/lib/repositories/approval.repository";
import { getSupabaseClient, isSupabaseConfigured, checkSupabaseConnection } from "@/lib/supabase/client";

export type DatabaseConnectionState = "connected" | "disconnected" | "fallback" | "checking";
export type EnvironmentFilter = "LIVE_REAL" | "CONTROLLED_TEST" | "SYNTHETIC" | "ARCHIVED_TEST" | "ALL";

interface TaskContextType {
  tasks: Task[];
  allTasks: Task[];
  agents: Agent[];
  leads: Lead[];
  approvals: Approval[];
  activities: ActivityItem[];
  loading: boolean;
  dbStatus: DatabaseConnectionState;
  dbStatusMessage: string;
  environmentFilter: EnvironmentFilter;
  setEnvironmentFilter: (env: EnvironmentFilter) => void;
  createTask: (input: TaskCreateInput) => Promise<Task>;
  updateTask: (id: string, updates: TaskUpdateInput) => Promise<Task>;
  deleteTask: (id: string) => Promise<boolean>;
  transitionTask: (id: string, nextStatus: TaskStatus, details?: { output?: any; error?: string }) => Promise<Task>;
  approveAction: (approvalId: string) => Promise<void>;
  rejectAction: (approvalId: string) => Promise<void>;
  getValidTransitions: (status: TaskStatus) => TaskStatus[];
  getAgentTaskInfo: (agentId: string) => {
    currentTaskTitle: string;
    status: AgentStatus;
    completedCount: number;
    runningCount: number;
    activeTask?: Task;
  };
  stats: {
    queued: number;
    running: number;
    waiting_approval: number;
    completed: number;
    failed: number;
    total: number;
  };
  refresh: () => Promise<void>;
}

const TaskContext = createContext<TaskContextType | undefined>(undefined);

export const TaskProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [rawTasks, setRawTasks] = useState<Task[]>([]);
  const [rawAgents, setRawAgents] = useState<Agent[]>([]);
  const [rawLeads, setRawLeads] = useState<Lead[]>([]);
  const [rawApprovals, setRawApprovals] = useState<Approval[]>([]);
  const [rawActivities, setRawActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [dbStatus, setDbStatus] = useState<DatabaseConnectionState>("checking");
  const [dbStatusMessage, setDbStatusMessage] = useState<string>("Checking database connection...");
  const [environmentFilter, setEnvironmentFilter] = useState<EnvironmentFilter>("LIVE_REAL");

  const loadData = useCallback(async () => {
    try {
      if (isSupabaseConfigured()) {
        const connCheck = await checkSupabaseConnection();
        if (connCheck.ok) {
          setDbStatus("connected");
          setDbStatusMessage(connCheck.message);
        } else {
          setDbStatus("disconnected");
          setDbStatusMessage(connCheck.message);
        }
      } else {
        setDbStatus("fallback");
        setDbStatusMessage("Supabase credentials not configured in .env.local (Running Local Mode)");
      }

      const [allTasks, allAgents, allLeads, allApprovals, allActivities] = await Promise.all([
        taskService.getAllTasks(),
        agentRepository.getAll(),
        leadRepository.getAll(),
        approvalRepository.getAll(),
        activityRepository.getAll()
      ]);

      setRawTasks(allTasks);
      setRawAgents(allAgents);
      setRawLeads(allLeads);
      setRawApprovals(allApprovals);
      setRawActivities(allActivities);
    } catch (err: any) {
      console.error("Failed to load task engine state", err);
      setDbStatus("fallback");
      setDbStatusMessage(err.message || "Failed to query state");
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Realtime subscription if Supabase is configured
  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;

    const channel = supabase
      .channel("schema-db-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, () => loadData())
      .on("postgres_changes", { event: "*", schema: "public", table: "approvals" }, () => loadData())
      .on("postgres_changes", { event: "*", schema: "public", table: "activities" }, () => loadData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadData]);

  // Helper to test if an entity is legacy test/demo
  const isLegacyItem = (item: any) => {
    if (item.environment === "LEGACY_TEST" || item.environment === "DEMO" || item.archived) return true;
    if (item.id && (item.id.startsWith("TSK-100") || item.id.startsWith("LEAD-00") || item.id.startsWith("APR-100") || item.id.startsWith("ACT-100"))) return true;
    if (item.company && (item.company.includes("Apex Logistics") || item.company.includes("NexaHealth") || item.company.includes("BlueWave") || item.company.includes("Horizon Legal") || item.company.includes("Summit Financial") || item.company.includes("Cascade Dental") || item.company.includes("Vanguard Precision"))) return true;
    return false;
  };

  // Filtered views based on Environment
  const tasks = useMemo(() => {
    if (environmentFilter === "ALL") return rawTasks;
    if (environmentFilter === "ARCHIVED_TEST") return rawTasks.filter(t => isLegacyItem(t) || t.environment === "LEGACY_TEST" || t.environment === "DEMO");
    if (environmentFilter === "CONTROLLED_TEST") return rawTasks.filter(t => t.environment === "CONTROLLED_TEST" || t.environment === "CONTROLLED_TEST_EXTERNAL_EFFECT");
    if (environmentFilter === "SYNTHETIC") return rawTasks.filter(t => t.environment === "SYNTHETIC" || t.environment === "SIMULATION");
    // LIVE_REAL (Production Default - show all active operational tasks)
    const live = rawTasks.filter(t => t.environment === "LIVE_REAL");
    return live.length > 0 ? live : rawTasks;
  }, [rawTasks, environmentFilter]);

  const leads = useMemo(() => {
    if (environmentFilter === "ALL") return rawLeads;
    if (environmentFilter === "ARCHIVED_TEST") return rawLeads.filter(l => isLegacyItem(l) || l.environment === "LEGACY_TEST" || l.environment === "DEMO");
    if (environmentFilter === "CONTROLLED_TEST") return rawLeads.filter(l => l.environment === "CONTROLLED_TEST" || l.environment === "CONTROLLED_TEST_EXTERNAL_EFFECT");
    if (environmentFilter === "SYNTHETIC") return rawLeads.filter(l => l.environment === "SYNTHETIC" || l.environment === "SIMULATION");
    // LIVE_REAL (Production Default - show all active pipeline leads)
    const live = rawLeads.filter(l => l.environment === "LIVE_REAL");
    return live.length > 0 ? live : rawLeads;
  }, [rawLeads, environmentFilter]);

  const approvals = useMemo(() => {
    if (environmentFilter === "ALL") return rawApprovals;
    if (environmentFilter === "ARCHIVED_TEST") return rawApprovals.filter(a => isLegacyItem(a) || a.environment === "LEGACY_TEST" || a.environment === "DEMO");
    if (environmentFilter === "CONTROLLED_TEST") return rawApprovals.filter(a => a.environment === "CONTROLLED_TEST" || a.environment === "CONTROLLED_TEST_EXTERNAL_EFFECT");
    if (environmentFilter === "SYNTHETIC") return rawApprovals.filter(a => a.environment === "SYNTHETIC" || a.environment === "SIMULATION");
    // LIVE_REAL (Production Default)
    const live = rawApprovals.filter(a => a.environment === "LIVE_REAL" || a.environment === "CONTROLLED_TEST_EXTERNAL_EFFECT" || !a.environment);
    return live.length > 0 ? live : rawApprovals;
  }, [rawApprovals, environmentFilter]);

  const activities = useMemo(() => {
    if (environmentFilter === "ALL") return rawActivities;
    if (environmentFilter === "ARCHIVED_TEST") return rawActivities.filter(act => isLegacyItem(act) || act.environment === "LEGACY_TEST" || act.environment === "DEMO");
    if (environmentFilter === "CONTROLLED_TEST") return rawActivities.filter(act => act.environment === "CONTROLLED_TEST" || act.environment === "CONTROLLED_TEST_EXTERNAL_EFFECT");
    if (environmentFilter === "SYNTHETIC") return rawActivities.filter(act => act.environment === "SYNTHETIC" || act.environment === "SIMULATION");
    // LIVE_REAL (Production Default)
    const live = rawActivities.filter(act => act.environment === "LIVE_REAL");
    return live.length > 0 ? live : rawActivities;
  }, [rawActivities, environmentFilter]);

  const createTask = async (input: TaskCreateInput): Promise<Task> => {
    const newTask = await taskService.createTask(input);
    await loadData();
    return newTask;
  };

  const updateTask = async (id: string, updates: TaskUpdateInput): Promise<Task> => {
    const updated = await taskService.updateTask(id, updates);
    await loadData();
    return updated;
  };

  const deleteTask = async (id: string): Promise<boolean> => {
    const success = await taskService.deleteTask(id);
    if (success) {
      await loadData();
    }
    return success;
  };

  const transitionTask = async (
    id: string, 
    nextStatus: TaskStatus, 
    details?: { output?: any; error?: string }
  ): Promise<Task> => {
    const updated = await taskService.transitionStatus(id, nextStatus, details);
    await loadData();
    return updated;
  };

  const approveAction = async (approvalId: string): Promise<void> => {
    try {
      await fetch("/api/approvals/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approvalId }),
      });
    } catch (e) {
      console.error("Failed to approve action via API", e);
      await approvalRepository.updateStatus(approvalId, "approved");
    }

    await loadData();
  };

  const rejectAction = async (approvalId: string): Promise<void> => {
    const approval = await approvalRepository.getById(approvalId);
    await approvalRepository.updateStatus(approvalId, "rejected");

    if (approval) {
      const relatedTask = rawTasks.find(t => t.id === approvalId.replace("APR-", "TSK-") || (approval.details.payloadPreview?.taskId === t.id));
      if (relatedTask && relatedTask.status === "waiting_approval") {
        await taskService.transitionStatus(relatedTask.id, "failed", { error: "Action rejected by operator policy guardrail." });
      }
    }

    await activityRepository.add({
      type: "approval_event",
      title: `Approval Rejected: ${approvalId}`,
      description: `Operator rejected action "${approval ? approval.action : approvalId}".`,
      level: "error",
      agentName: "Operator",
      metadata: { approvalId }
    });

    await loadData();
  };

  const getValidTransitions = useCallback((status: TaskStatus): TaskStatus[] => {
    return taskService.getValidTransitions(status);
  }, []);

  const getAgentTaskInfo = useCallback((agentId: string) => {
    const agentTasks = tasks.filter(t => t.assignedAgentId === agentId);
    const runningTask = agentTasks.find(t => t.status === "running");
    const waitingTask = agentTasks.find(t => t.status === "waiting_approval");
    const queuedTask = agentTasks.find(t => t.status === "queued");
    const completedCount = agentTasks.filter(t => t.status === "completed").length;
    const runningCount = agentTasks.filter(t => t.status === "running").length;

    let currentTaskTitle = "Idle - No active task assigned";
    let status: AgentStatus = "idle";
    let activeTask: Task | undefined = undefined;

    if (runningTask) {
      currentTaskTitle = runningTask.title;
      status = "running";
      activeTask = runningTask;
    } else if (waitingTask) {
      currentTaskTitle = `Waiting Approval: ${waitingTask.title}`;
      status = "waiting_approval";
      activeTask = waitingTask;
    } else if (queuedTask) {
      currentTaskTitle = `Queued: ${queuedTask.title}`;
      status = "active";
      activeTask = queuedTask;
    }

    return {
      currentTaskTitle,
      status,
      completedCount,
      runningCount,
      activeTask
    };
  }, [tasks]);

  const stats = useMemo(() => {
    const queued = tasks.filter(t => t.status === "queued").length;
    const running = tasks.filter(t => t.status === "running").length;
    const waiting_approval = tasks.filter(t => t.status === "waiting_approval").length;
    const completed = tasks.filter(t => t.status === "completed").length;
    const failed = tasks.filter(t => t.status === "failed").length;

    return {
      queued,
      running,
      waiting_approval,
      completed,
      failed,
      total: tasks.length
    };
  }, [tasks]);

  return (
    <TaskContext.Provider
      value={{
        tasks,
        allTasks: rawTasks,
        agents: rawAgents,
        leads,
        approvals,
        activities,
        loading,
        dbStatus,
        dbStatusMessage,
        environmentFilter,
        setEnvironmentFilter,
        createTask,
        updateTask,
        deleteTask,
        transitionTask,
        approveAction,
        rejectAction,
        getValidTransitions,
        getAgentTaskInfo,
        stats,
        refresh: loadData
      }}
    >
      {children}
    </TaskContext.Provider>
  );
};

export const useTaskManager = () => {
  const context = useContext(TaskContext);
  if (!context) {
    throw new Error("useTaskManager must be used within a TaskProvider");
  }
  return context;
};