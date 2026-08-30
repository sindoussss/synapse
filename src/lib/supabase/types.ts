
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      agents: {
        Row: {
          id: string;
          name: string;
          role: string;
          status: string;
          model_provider: string;
          model_name: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          name: string;
          role: string;
          status?: string;
          model_provider?: string;
          model_name?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          role?: string;
          status?: string;
          model_provider?: string;
          model_name?: string;
          updated_at?: string;
        };
      };
      leads: {
        Row: {
          id: string;
          company_name: string;
          website: string;
          industry: string;
          website_score: number;
          opportunity_score: number;
          status: string;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          company_name: string;
          website: string;
          industry: string;
          website_score?: number;
          opportunity_score?: number;
          status?: string;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_name?: string;
          website?: string;
          industry?: string;
          website_score?: number;
          opportunity_score?: number;
          status?: string;
          notes?: string | null;
          updated_at?: string;
        };
      };
      tasks: {
        Row: {
          id: string;
          title: string;
          description: string;
          type: string;
          status: string;
          priority: string;
          assigned_agent_id: string;
          target_lead_id: string | null;
          parent_task_id: string | null;
          input: Json | null;
          output: Json | null;
          error: string | null;
          created_at: string;
          started_at: string | null;
          completed_at: string | null;
          updated_at: string;
        };
        Insert: {
          id: string;
          title: string;
          description: string;
          type: string;
          status?: string;
          priority?: string;
          assigned_agent_id: string;
          target_lead_id?: string | null;
          parent_task_id?: string | null;
          input?: Json | null;
          output?: Json | null;
          error?: string | null;
          created_at?: string;
          started_at?: string | null;
          completed_at?: string | null;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string;
          type?: string;
          status?: string;
          priority?: string;
          assigned_agent_id?: string;
          target_lead_id?: string | null;
          parent_task_id?: string | null;
          input?: Json | null;
          output?: Json | null;
          error?: string | null;
          started_at?: string | null;
          completed_at?: string | null;
          updated_at?: string;
        };
      };
      approvals: {
        Row: {
          id: string;
          task_id: string | null;
          action_type: string;
          description: string;
          risk_level: string;
          payload: Json | null;
          status: string;
          created_at: string;
          resolved_at: string | null;
        };
        Insert: {
          id: string;
          task_id?: string | null;
          action_type: string;
          description: string;
          risk_level?: string;
          payload?: Json | null;
          status?: string;
          created_at?: string;
          resolved_at?: string | null;
        };
        Update: {
          id?: string;
          task_id?: string | null;
          action_type?: string;
          description?: string;
          risk_level?: string;
          payload?: Json | null;
          status?: string;
          resolved_at?: string | null;
        };
      };
      activities: {
        Row: {
          id: string;
          agent_id: string | null;
          task_id: string | null;
          action: string;
          message: string;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id: string;
          agent_id?: string | null;
          task_id?: string | null;
          action: string;
          message: string;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          agent_id?: string | null;
          task_id?: string | null;
          action?: string;
          message?: string;
          metadata?: Json | null;
        };
      };
    };
  };
}
