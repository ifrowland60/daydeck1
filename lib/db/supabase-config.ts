export function getSupabaseConfig() {
  const rawSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabasePublishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!rawSupabaseUrl || !supabasePublishableKey) {
    throw new Error(
      "Missing Supabase environment variables. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY).",
    );
  }

  let supabaseUrl: string;
  try {
    // Normalize to origin so pasted endpoint paths like /rest/v1 do not break auth.
    supabaseUrl = new URL(rawSupabaseUrl).origin;
  } catch {
    throw new Error("Invalid supabaseUrl: Provided URL is malformed.");
  }

  return { supabaseUrl, supabasePublishableKey };
}
