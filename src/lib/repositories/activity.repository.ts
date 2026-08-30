
import { ActivityItem, ActivityType, ActivityLevel } from "@/data/types";
import { MOCK_ACTIVITY } from "@/data/activity";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";

export interface IActivityRepository {
  getAll(): Promise<ActivityItem[]>;
  add(item: Omit<ActivityItem, "id" | "timestamp" | "timeAgo">): Promise<ActivityItem>;
  clear(): Promise<void>;
}

const STORAGE_KEY = "synapse_ops_activities_v2";

export class SupabaseActivityRepository implements IActivityRepository {
  private getLocalActivities(): ActivityItem[] {
    if (typeof window === "undefined") return [...MOCK_ACTIVITY];
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(MOCK_ACTIVITY));
        return [...MOCK_ACTIVITY];
      }
      return JSON.parse(data) as ActivityItem[];
    } catch {
      return [...MOCK_ACTIVITY];
    }
  }

  private saveLocalActivities(items: ActivityItem[]): void {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      } catch {}
    }
  }

  private mapRowToActivity(row: any): ActivityItem {
    return {
      id: row.id,
      timestamp: row.created_at.replace("T", " ").substring(0, 19),
      timeAgo: "Just now",
      agentId: row.agent_id || undefined,
      agentName: row.metadata?.agentName || "System Operator",
      type: row.action as ActivityType,
      title: row.metadata?.title || `Activity: ${row.action}`,
      description: row.message,
      level: (row.metadata?.level as ActivityLevel) || "info",
      metadata: row.metadata || {}
    };
  }

  async getAll(): Promise<ActivityItem[]> {
    if (!isSupabaseConfigured()) {
      return this.getLocalActivities();
    }
    const supabase = getSupabaseClient()!;
    const { data, error } = await supabase
      .from("activities")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error || !data || data.length === 0) {
      return this.getLocalActivities();
    }
    return (data as any[]).map(this.mapRowToActivity);
  }

  async add(item: Omit<ActivityItem, "id" | "timestamp" | "timeAgo">): Promise<ActivityItem> {
    const now = new Date();
    const newId = `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    if (!isSupabaseConfigured()) {
      const newActivity: ActivityItem = {
        ...item,
        id: newId,
        timestamp: now.toISOString().replace("T", " ").substring(0, 19),
        timeAgo: "Just now",
      };
      const updated = [newActivity, ...this.getLocalActivities().slice(0, 49)];
      this.saveLocalActivities(updated);
      return newActivity;
    }

    const supabase = getSupabaseClient()!;
    const metadataPayload = {
      ...(item.metadata || {}),
      title: item.title,
      level: item.level,
      agentName: item.agentName,
    };

    const insertPayload: any = {
      id: newId,
      agent_id: item.agentId || null,
      task_id: (item.metadata?.taskId as string) || null,
      action: item.type,
      message: item.description,
      metadata: metadataPayload,
      created_at: now.toISOString(),
    };

    const { data, error } = await supabase
      .from("activities")
      .insert(insertPayload)
      .select()
      .single();

    if (error) {
      console.error("[SupabaseActivityRepository.add] error:", error);
      const fallback: ActivityItem = {
        ...item,
        id: newId,
        timestamp: now.toISOString().replace("T", " ").substring(0, 19),
        timeAgo: "Just now",
      };
      return fallback;
    }
    return this.mapRowToActivity(data);
  }

  async clear(): Promise<void> {
    if (!isSupabaseConfigured()) {
      this.saveLocalActivities([]);
      return;
    }
    const supabase = getSupabaseClient()!;
    await supabase.from("activities").delete().neq("id", "");
  }
}

export const activityRepository: IActivityRepository = new SupabaseActivityRepository();
