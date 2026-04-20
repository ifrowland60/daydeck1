import Link from "next/link";
import { redirect } from "next/navigation";

import {
  changePasswordSettingsAction,
  logoutAction,
  requestPasswordResetEmailFromSettingsAction,
} from "@/lib/auth/actions";
import { getSupabaseServerClient } from "@/lib/db/supabase-server";

export const dynamic = "force-dynamic";

type SearchParams = {
  error?: string;
  success?: string;
};

export default async function AccountSettingsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const supabase = await getSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/auth");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const params = await searchParams;

  return (
    <main className="mx-auto min-h-screen w-full max-w-2xl px-6 py-8 sm:py-10">
      <header className="mb-8 flex items-center justify-between">
        <Link
          href="/app"
          className="text-xl font-light tracking-[0.04em] text-slate-500 transition hover:text-slate-700 sm:text-2xl"
        >
          Daydeck
        </Link>
        <div className="flex items-center gap-2">
          <form action={logoutAction}>
            <button
              type="submit"
              aria-label="Log out"
              title="Log out"
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-300 text-slate-700 transition hover:bg-slate-50"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none">
                <path
                  d="M14 4h-8a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M10 12h10m0 0-3-3m3 3-3 3"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </form>
        </div>
      </header>

      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Account settings</h1>
      <p className="mt-1 text-sm text-slate-600">
        <Link href="/app" className="font-medium text-slate-700 underline-offset-2 hover:underline">
          ← Back to calendar
        </Link>
      </p>

      {params.error ? (
        <p className="mt-6 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {params.error}
        </p>
      ) : null}

      {params.success ? (
        <p className="mt-6 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {params.success}
        </p>
      ) : null}

      <section className="mt-8 space-y-6">
        <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Account</h2>
          <p className="mt-3 text-sm text-slate-600">Signed in as</p>
          <p className="mt-1 font-medium text-slate-900">{user?.email ?? "—"}</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Change password</h2>
          <p className="mt-2 text-sm text-slate-600">
            Set a new password for your account. You must be signed in on this device.
          </p>
          <form action={changePasswordSettingsAction} className="mt-4 space-y-4">
            <div className="space-y-1">
              <label htmlFor="password" className="text-sm font-medium text-slate-700">
                New password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                placeholder="At least 8 characters"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="confirmPassword" className="text-sm font-medium text-slate-700">
                Confirm new password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                placeholder="Repeat password"
              />
            </div>
            <button
              type="submit"
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              Update password
            </button>
          </form>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Reset password by email
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            We will send a link to <span className="font-medium text-slate-800">{user?.email}</span>. Open
            it on any device to choose a new password. Use this if you prefer email recovery or no longer
            know your current password.
          </p>
          <form action={requestPasswordResetEmailFromSettingsAction} className="mt-4">
            <button
              type="submit"
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 transition hover:bg-slate-50"
            >
              Send reset link
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
