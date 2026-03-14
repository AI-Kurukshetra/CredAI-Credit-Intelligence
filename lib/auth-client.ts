import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

export async function getAccessToken() {
  const supabase = createBrowserSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return session?.access_token ?? null;
}
