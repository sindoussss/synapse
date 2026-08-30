
import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let clientInstance: SupabaseClient | null = null;

export function isSupabaseConfigured(): boolean {
  return (
    !!supabaseUrl &&
    !!supabaseAnonKey &&
    supabaseUrl.startsWith("http") &&
    !supabaseUrl.includes("your-project")
  );
}

export function getSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) {
    return null;
  }
  if (!clientInstance) {
    clientInstance = createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        persistSession: false,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
  }
  return clientInstance;
}

export async function checkSupabaseConnection(): Promise<{ ok: boolean; message: string }> {
  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      message: "Supabase environment variables not configured in .env.local"
    };
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    return { ok: false, message: "Failed to initialize Supabase client" };
  }

  try {
    const { count, error } = await supabase
      .from("agents")
      .select("*", { count: "exact", head: true });

    if (error) {
      return { ok: false, message: error.message };
    }
    return { ok: true, message: `Connected to Supabase PostgreSQL (${count ?? 0} agents found)` };
  } catch (err: any) {
    return { ok: false, message: err.message || "Network error connecting to Supabase" };
  }
}
