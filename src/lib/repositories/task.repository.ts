import { Task, TaskCreateInput, TaskUpdateInput, TaskStatus, TaskPriority, TaskType, OperationalEnvironment } from "@/data/types";
import { INITIAL_TASKS } from "@/data/tasks";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";

export interface ITaskRepository {
  getAll(): Promise<Task[]>;
  getById(id: string): Promise<Task | null>;
  create(task: TaskCreateInput): Promise<Task>;
  update(id: string, updates: TaskUpdateInput): Promise<Task>;
  delete(id: string): Promise<boolean>;
}

const STORAGE_KEY = "synapse_ops_tasks_v2";

const VALID_ENVIRONMENTS: OperationalEnvironment[] = [
  "LIVE_REAL",
  "CONTROLLED_TEST",
  "CONTROLLED_TEST_EXTERNAL_EFFECT",
  "SYNTHETIC",
  "SIMULATION",
  "DEMO",
  "LEGACY_TEST",
  "UNCLASSIFIED",
];

export function sanitizeEnvironment(envCandidate?: any): OperationalEnvironment {
  if (typeof envCandidate === "string" && VALID_ENVIRONMENTS.includes(envCandidate as OperationalEnvironment)) {
    return envCandidate as OperationalEnvironment;
  }
  return "UNCLASSIFIED";
}

export class LocalStorageTaskRepository implements ITaskRepository {
  private memoryFallback: Task[] = [...INITIAL_TASKS];

  private getStoredTasks(): Task[] {
    if (typeof window === "undefined") {
      return this.memoryFallback;
    }
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_TASKS));
        return [...INITIAL_TASKS];
      }
      return JSON.parse(data) as Task[];
    } catch (e) {
      console.warn("LocalStorage fallback active", e);
      return this.memoryFallback;
    }
  }

  private saveTasks(tasks: Task[]): void {
    this.memoryFallback = tasks;
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
      } catch (e) {
        console.warn("LocalStorage write error", e);
      }
    }
  }

  async getAll(): Promise<Task[]> {
    return this.getStoredTasks();
  }

  async getById(id: string): Promise<Task | null> {
    const tasks = this.getStoredTasks();
    return tasks.find(t => t.id === id) || null;
  }

  async create(input: TaskCreateInput): Promise<Task> {
    const tasks = this.getStoredTasks();
    const nextNumericId = tasks.length > 0
      ? Math.max(...tasks.map(t => {
          const num = parseInt(t.id.replace("TSK-", ""), 10);
          return isNaN(num) ? 1000 : num;
        })) + 1
      : 1001;

    const env = sanitizeEnvironment(input.environment);

    const newTask: Task = {
      id: `TSK-${nextNumericId}`,
      title: input.title.trim(),
      description: input.description.trim(),
      type: input.type,
      status: input.status || "queued",
      priority: input.priority || "medium",
      assignedAgentId: input.assignedAgentId,
      targetLeadId: input.targetLeadId || undefined,
      parentTaskId: input.parentTaskId || undefined,
      input: {
        ...(input.input || {}),
        environment: env,
      },
      output: null,
      createdAt: new Date().toISOString(),
      startedAt: input.status === "running" ? new Date().toISOString() : undefined,
      environment: env,
    };

    const updated = [newTask, ...tasks];
    this.saveTasks(updated);
    return newTask;
  }

  async update(id: string, updates: TaskUpdateInput): Promise<Task> {
    const tasks = this.getStoredTasks();
    const index = tasks.findIndex(t => t.id === id);
    if (index === -1) throw new Error(`Task with id ${id} not found`);

    const existing = tasks[index];
    const newEnv = updates.environment !== undefined ? sanitizeEnvironment(updates.environment) : existing.environment;

    const updatedTask: Task = {
      ...existing,
      ...updates,
      title: updates.title !== undefined ? updates.title.trim() : existing.title,
      description: updates.description !== undefined ? updates.description.trim() : existing.description,
      environment: newEnv,
      input: {
        ...(existing.input || {}),
        ...(updates.input || {}),
        environment: newEnv,
      },
    };

    tasks[index] = updatedTask;
    this.saveTasks(tasks);
    return updatedTask;
  }

  async delete(id: string): Promise<boolean> {
    const tasks = this.getStoredTasks();
    const filtered = tasks.filter(t => t.id !== id);
    if (filtered.length === tasks.length) return false;
    this.saveTasks(filtered);
    return true;
  }
}

export class SupabaseTaskRepository implements ITaskRepository {
  private localFallback = new LocalStorageTaskRepository();

  private mapRowToTask(row: any): Task {
    const envCandidate = row.environment || (row.input && row.input.environment);
    const env = sanitizeEnvironment(envCandidate);

    return {
      id: row.id,
      title: row.title,
      description: row.description,
      type: row.type as TaskType,
      status: row.status as TaskStatus,
      priority: row.priority as TaskPriority,
      assignedAgentId: row.assigned_agent_id,
      targetLeadId: row.target_lead_id || undefined,
      parentTaskId: row.parent_task_id || undefined,
      input: row.input,
      output: row.output,
      error: row.error || undefined,
      createdAt: row.created_at,
      startedAt: row.started_at || undefined,
      completedAt: row.completed_at || undefined,
      environment: env,
      archived: row.archived || false,
    };
  }

  async getAll(): Promise<Task[]> {
    if (!isSupabaseConfigured()) {
      return this.localFallback.getAll();
    }
    const supabase = getSupabaseClient()!;
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[SupabaseTaskRepository.getAll] error:", error);
      return this.localFallback.getAll();
    }
    if (!data || data.length === 0) {
      return this.localFallback.getAll();
    }
    return (data as any[]).map(r => this.mapRowToTask(r));
  }

  async getById(id: string): Promise<Task | null> {
    if (!isSupabaseConfigured()) {
      return this.localFallback.getById(id);
    }
    const supabase = getSupabaseClient()!;
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) {
      return this.localFallback.getById(id);
    }
    return this.mapRowToTask(data);
  }

  async create(input: TaskCreateInput): Promise<Task> {
    if (!isSupabaseConfigured()) {
      return this.localFallback.create(input);
    }
    const supabase = getSupabaseClient()!;

    const { data: allTasks } = await supabase.from("tasks").select("id");
    const nextNum = (allTasks && allTasks.length > 0)
      ? Math.max(...(allTasks as any[]).map(t => {
          const num = parseInt(t.id.replace("TSK-", ""), 10);
          return isNaN(num) ? 1000 : num;
        })) + 1
      : 1001;

    const newId = `TSK-${nextNum}`;
    const now = new Date().toISOString();
    const explicitEnv = sanitizeEnvironment(input.environment);

    const insertPayload: any = {
      id: newId,
      title: input.title.trim(),
      description: input.description.trim(),
      type: input.type,
      status: input.status || "queued",
      priority: input.priority || "medium",
      assigned_agent_id: input.assignedAgentId,
      target_lead_id: input.targetLeadId || null,
      parent_task_id: input.parentTaskId || null,
      input: {
        ...(input.input || {}),
        environment: explicitEnv,
      },
      output: null,
      created_at: now,
      started_at: input.status === "running" ? now : null,
    };

    const { data, error } = await supabase
      .from("tasks")
      .insert(insertPayload)
      .select()
      .single();

    if (error) {
      console.error("[SupabaseTaskRepository.create] error:", error);
      return this.localFallback.create(input);
    }
    return this.mapRowToTask(data);
  }

  async update(id: string, updates: TaskUpdateInput): Promise<Task> {
    if (!isSupabaseConfigured()) {
      return this.localFallback.update(id, updates);
    }
    const supabase = getSupabaseClient()!;

    const existing = await this.getById(id);
    const newEnv = updates.environment !== undefined ? sanitizeEnvironment(updates.environment) : (existing?.environment || "UNCLASSIFIED");

    const updatePayload: any = {
      updated_at: new Date().toISOString()
    };
    if (updates.title !== undefined) updatePayload.title = updates.title.trim();
    if (updates.description !== undefined) updatePayload.description = updates.description.trim();
    if (updates.type !== undefined) updatePayload.type = updates.type;
    if (updates.status !== undefined) updatePayload.status = updates.status;
    if (updates.priority !== undefined) updatePayload.priority = updates.priority;
    if (updates.assignedAgentId !== undefined) updatePayload.assigned_agent_id = updates.assignedAgentId;
    if (updates.targetLeadId !== undefined) updatePayload.target_lead_id = updates.targetLeadId || null;
    if (updates.parentTaskId !== undefined) updatePayload.parent_task_id = updates.parentTaskId || null;
    if (updates.output !== undefined) updatePayload.output = updates.output;
    if (updates.error !== undefined) updatePayload.error = updates.error;
    if (updates.startedAt !== undefined) updatePayload.started_at = updates.startedAt;
    if (updates.completedAt !== undefined) updatePayload.completed_at = updates.completedAt;

    // Update input JSON with environment
    updatePayload.input = {
      ...(existing?.input || {}),
      ...(updates.input || {}),
      environment: newEnv,
    };

    const { data, error } = await supabase
      .from("tasks")
      .update(updatePayload)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("[SupabaseTaskRepository.update] error:", error);
      return this.localFallback.update(id, updates);
    }
    return this.mapRowToTask(data);
  }

  async delete(id: string): Promise<boolean> {
    if (!isSupabaseConfigured()) {
      return this.localFallback.delete(id);
    }
    const supabase = getSupabaseClient()!;
    const { error } = await supabase
      .from("tasks")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("[SupabaseTaskRepository.delete] error:", error);
      return this.localFallback.delete(id);
    }
    return true;
  }
}

export const taskRepository: ITaskRepository = new SupabaseTaskRepository();