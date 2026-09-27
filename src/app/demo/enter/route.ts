import { NextResponse, type NextRequest } from "next/server";
import { isDemoMode, LOCAL_COOKIE, LOCAL_COOKIE_OPTIONS, signLocalSession } from "@/lib/auth/local";
import { ensureDemoReady } from "@/lib/demo/setup";
import { DEMO_DEFAULT_USER_ID } from "@/lib/demo/seed";

export const dynamic = "force-dynamic";

/** First visit in demo mode: prepare the DB if needed, then enter as the 사업단장. */
export async function GET(request: NextRequest) {
  if (!isDemoMode()) return NextResponse.redirect(new URL("/login", request.url));
  try {
    await ensureDemoReady();
  } catch (e) {
    console.error("demo setup failed", e);
    return NextResponse.redirect(new URL("/setup?error=db", request.url));
  }
  const next = request.nextUrl.searchParams.get("next") ?? "/";
  const safeNext = next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/demo") ? next : "/";
  const response = NextResponse.redirect(new URL(safeNext, request.url));
  response.cookies.set(LOCAL_COOKIE, signLocalSession(DEMO_DEFAULT_USER_ID), LOCAL_COOKIE_OPTIONS);
  return response;
}
