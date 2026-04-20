"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { getSupabaseServerClient } from "@/lib/db/supabase-server";

function toAuthPath(message: string, type: "error" | "success" = "error") {
  const search = new URLSearchParams({ [type]: message });
  return `/auth?${search.toString()}`;
}

function toSettingsPath(message: string, type: "error" | "success" = "error") {
  const search = new URLSearchParams({ [type]: message });
  return `/app/settings?${search.toString()}`;
}

async function getRequestOrigin() {
  const headerList = await headers();
  const origin = headerList.get("origin");

  if (origin) {
    return origin;
  }

  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  const protocol = headerList.get("x-forwarded-proto") ?? "http";
  return host ? `${protocol}://${host}` : "http://localhost:3000";
}

function buildAuthRedirectUrl(origin: string, path = "/auth") {
  try {
    const parsed = new URL(origin);
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    return `${parsed.origin}${cleanPath}`;
  } catch {
    return undefined;
  }
}

/** Trim + lowercase so sign-in matches sign-up; avoids HTML `type="email"` rejecting some valid addresses. */
function normalizeAuthEmail(raw: unknown): string {
  return String(raw ?? "")
    .trim()
    .toLowerCase();
}

export async function loginAction(formData: FormData) {
  const email = normalizeAuthEmail(formData.get("email"));
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    redirect(toAuthPath("Email and password are required."));
  }

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(toAuthPath(error.message));
  }

  redirect("/app");
}

export async function signupAction(formData: FormData) {
  const email = normalizeAuthEmail(formData.get("email"));
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!email || !password) {
    redirect(toAuthPath("Email and password are required."));
  }

  if (password !== confirmPassword) {
    redirect(toAuthPath("Passwords do not match."));
  }

  if (password.length < 8) {
    redirect(toAuthPath("Password must be at least 8 characters."));
  }

  const supabase = await getSupabaseServerClient();
  const origin = await getRequestOrigin();
  const emailRedirectTo = buildAuthRedirectUrl(origin);
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: emailRedirectTo ? { emailRedirectTo } : undefined,
  });

  if (error) {
    redirect(toAuthPath(error.message));
  }

  redirect(toAuthPath("Account created. You can now sign in.", "success"));
}

export async function resetPasswordAction(formData: FormData) {
  const email = normalizeAuthEmail(formData.get("email"));

  if (!email) {
    redirect(toAuthPath("Email is required for password reset."));
  }

  const supabase = await getSupabaseServerClient();
  const origin = await getRequestOrigin();
  const redirectTo = buildAuthRedirectUrl(
    origin,
    "/auth/confirm?next=%2Fauth%3Fmode%3Dupdate",
  );
  const { error } = await supabase.auth.resetPasswordForEmail(email, redirectTo ? { redirectTo } : undefined);

  if (error) {
    redirect(toAuthPath(error.message));
  }

  redirect(
    toAuthPath(
      "If this email is registered, a password reset link has been sent.",
      "success",
    ),
  );
}

export async function updatePasswordAction(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (password !== confirmPassword) {
    redirect(toAuthPath("Passwords do not match."));
  }

  if (!password || password.length < 8) {
    redirect(toAuthPath("Password must be at least 8 characters."));
  }

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    redirect(toAuthPath(error.message));
  }

  redirect(toAuthPath("Password updated. You can now sign in.", "success"));
}

export async function logoutAction() {
  const supabase = await getSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/auth");
}

export async function changePasswordSettingsAction(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (password !== confirmPassword) {
    redirect(toSettingsPath("New passwords do not match."));
  }

  if (!password || password.length < 8) {
    redirect(toSettingsPath("Password must be at least 8 characters."));
  }

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    redirect(toSettingsPath(error.message));
  }

  redirect(toSettingsPath("Your password has been updated.", "success"));
}

/** Sends a password recovery link to the signed-in user's email (same flow as /auth reset). */
export async function requestPasswordResetEmailFromSettingsAction() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    redirect(toSettingsPath("No email address is associated with this account."));
  }

  const origin = await getRequestOrigin();
  const redirectTo = buildAuthRedirectUrl(
    origin,
    "/auth/confirm?next=%2Fauth%3Fmode%3Dupdate",
  );
  const { error } = await supabase.auth.resetPasswordForEmail(user.email, redirectTo ? { redirectTo } : undefined);

  if (error) {
    redirect(toSettingsPath(error.message));
  }

  redirect(
    toSettingsPath(
      "If your account uses this email, a password reset link has been sent.",
      "success",
    ),
  );
}
