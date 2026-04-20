"use client";

import { useMemo, useState } from "react";

import {
  loginAction,
  resetPasswordAction,
  signupAction,
  updatePasswordAction,
} from "@/lib/auth/actions";

type AuthMode = "login" | "signup" | "reset" | "update";

interface AuthFormProps {
  initialMode: AuthMode;
  errorMessage?: string;
  successMessage?: string;
}

const modeCopy: Record<AuthMode, { title: string; description: string; action: string }> = {
  login: {
    title: "Welcome back",
    description: "Sign in to open your day workspace.",
    action: "Log in",
  },
  signup: {
    title: "Create your account",
    description: "Set up Daydeck with your email and password.",
    action: "Sign up",
  },
  reset: {
    title: "Reset password",
    description: "Request a password reset link by email.",
    action: "Send reset link",
  },
  update: {
    title: "Set a new password",
    description: "Choose a new password to finish recovery.",
    action: "Update password",
  },
};

export function AuthForm({
  initialMode,
  errorMessage,
  successMessage,
}: AuthFormProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const active = modeCopy[mode];

  const formAction = useMemo(() => {
    if (mode === "signup") return signupAction;
    if (mode === "reset") return resetPasswordAction;
    if (mode === "update") return updatePasswordAction;
    return loginAction;
  }, [mode]);

  return (
    <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
      <div className="mb-6">
        <p className="text-sm uppercase tracking-[0.16em] text-slate-500">Daydeck</p>
        <h1 className="mt-3 text-2xl font-semibold text-slate-900">{active.title}</h1>
        <p className="mt-2 text-sm text-slate-600">{active.description}</p>
      </div>

      {mode !== "update" ? (
        <div className="mb-6 flex rounded-lg border border-slate-200 bg-slate-50 p-1">
          <ModeButton mode={mode} target="login" onClick={setMode} label="Log in" />
          <ModeButton mode={mode} target="signup" onClick={setMode} label="Sign up" />
          <ModeButton mode={mode} target="reset" onClick={setMode} label="Reset" />
        </div>
      ) : (
        <div className="mb-6 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
          Recovery verified. Enter a new password below.
        </div>
      )}

      {errorMessage ? (
        <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {errorMessage}
        </p>
      ) : null}

      {successMessage ? (
        <p className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {successMessage}
        </p>
      ) : null}

      <form action={formAction} className="space-y-4">
        {mode !== "update" ? (
          <div className="space-y-1">
            <label htmlFor="email" className="text-sm font-medium text-slate-700">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-400"
              placeholder="you@example.com"
            />
          </div>
        ) : null}

        {mode !== "reset" ? (
          <div className="space-y-1">
            <label htmlFor="password" className="text-sm font-medium text-slate-700">
              {mode === "update" ? "New password" : "Password"}
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              required
              minLength={8}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-400"
              placeholder="At least 8 characters"
            />
          </div>
        ) : null}

        <button
          type="submit"
          className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
        >
          {active.action}
        </button>
      </form>
    </div>
  );
}

function ModeButton({
  mode,
  target,
  onClick,
  label,
}: {
  mode: AuthMode;
  target: AuthMode;
  onClick: (target: AuthMode) => void;
  label: string;
}) {
  const isActive = mode === target;

  return (
    <button
      type="button"
      onClick={() => onClick(target)}
      className={`flex-1 rounded-md px-2 py-2 text-sm transition ${
        isActive ? "bg-white text-slate-900" : "text-slate-600 hover:text-slate-900"
      }`}
    >
      {label}
    </button>
  );
}
