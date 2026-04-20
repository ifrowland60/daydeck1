import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import { getSupabaseServerClient } from "@/lib/db/supabase-server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const next = requestUrl.searchParams.get("next") ?? "/auth";
  const code = requestUrl.searchParams.get("code");
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type") as EmailOtpType | null;

  const supabase = await getSupabaseServerClient();

  // PKCE (default in current Supabase projects): email links include ?code=…
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(
        new URL(`/auth?error=${encodeURIComponent(error.message)}`, request.url),
      );
    }
    return NextResponse.redirect(new URL(next, request.url));
  }

  // Older / alternate flow: ?token_hash=…&type=recovery|signup|…
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });

    if (error) {
      return NextResponse.redirect(
        new URL(`/auth?error=${encodeURIComponent(error.message)}`, request.url),
      );
    }

    return NextResponse.redirect(new URL(next, request.url));
  }

  return NextResponse.redirect(
    new URL("/auth?error=Invalid+or+expired+recovery+link.", request.url),
  );
}
