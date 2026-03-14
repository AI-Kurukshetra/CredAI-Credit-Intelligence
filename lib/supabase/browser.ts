import { createClient, SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | undefined;

export function createBrowserSupabaseClient() {
  if (browserClient) {
    return browserClient;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase environment variables are not configured.");
  }

  browserClient = createClient(supabaseUrl, supabaseAnonKey);
  return browserClient;
}
