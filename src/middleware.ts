import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { DEMO_COOKIE, isDemoMode } from "@/lib/auth/mode";

const PUBLIC_PATHS = ["/login", "/signup", "/auth", "/onboarding", "/forgot-password", "/reset-password", "/setup", "/demo"];

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));

  // Demo mode runs on a built-in temporary database when none is configured.
  if (!process.env.DATABASE_URL && !isDemoMode()) {
    if (pathname !== "/setup") return NextResponse.redirect(new URL("/setup", request.url));
    return NextResponse.next();
  }

  if (isDemoMode()) {
    if (!request.cookies.has(DEMO_COOKIE) && !isPublic) {
      const enter = new URL("/demo/enter", request.url);
      enter.searchParams.set("next", pathname + search);
      return NextResponse.redirect(enter);
    }
    return NextResponse.next();
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    if (!isPublic) return NextResponse.redirect(new URL("/login", request.url));
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  const { data } = await supabase.auth.getUser();
  if (!data.user && !isPublic) return NextResponse.redirect(new URL("/login", request.url));
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|.*\\.(?:png|jpg|jpeg|svg|webp|ico|css|js|mp4|webm)$).*)"],
};
