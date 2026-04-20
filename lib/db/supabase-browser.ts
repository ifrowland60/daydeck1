import { createBrowserClient } from "@supabase/ssr";

import { getSupabaseConfig } from "@/lib/db/supabase-config";

export function getSupabaseBrowserClient() {
  const { supabaseUrl, supabasePublishableKey } = getSupabaseConfig();

  return createBrowserClient(supabaseUrl, supabasePublishableKey);
}
