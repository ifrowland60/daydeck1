import { redirect } from "next/navigation";

import { AuthForm } from "@/components/auth/auth-form";
import { getSupabaseServerClient } from "@/lib/db/supabase-server";

export const dynamic = "force-dynamic";

type SearchParams = {
  mode?: "login" | "signup" | "reset" | "update";
  error?: string;
  success?: string;
};

export default async function AuthPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const supabase = await getSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const params = await searchParams;
  const initialMode = params.mode ?? "login";

  if (session && initialMode !== "update") {
    redirect("/app");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-10">
      <AuthForm
        initialMode={initialMode}
        errorMessage={params.error}
        successMessage={params.success}
      />
    </main>
  );
}
