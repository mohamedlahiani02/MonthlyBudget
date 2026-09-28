import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";
import { safeNextPath } from "@/lib/safe-redirect";

const PUBLIC_PATHS = ["/login", "/api/auth/login"];

// Bearer-token or unauthenticated-by-design endpoints for the MCP connector.
// These routes perform their own authentication.
const MCP_PUBLIC_PATHS = ["/api/mcp", "/.well-known", "/oauth/register", "/oauth/token"];

function matches(pathname: string, paths: readonly string[]): boolean {
  return paths.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  if (matches(pathname, MCP_PUBLIC_PATHS)) return NextResponse.next();

  const isPublic = matches(pathname, PUBLIC_PATHS);

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const authed = await verifySessionToken(token);

  // Redirect authed users away from the login page.
  if (pathname === "/login" && authed) {
    const next = safeNextPath(req.nextUrl.searchParams.get("next")) ?? "/";
    return NextResponse.redirect(new URL(next, req.url));
  }

  if (isPublic) return NextResponse.next();

  if (!authed) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const url = new URL("/login", req.url);
    if (pathname !== "/") url.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Protect everything except Next internals, the service worker, and static
    // icon/manifest assets (needed for PWA install & to load without a session).
    "/((?!_next/static|_next/image|favicon.ico|sw.js|.*\\.(?:png|svg|ico|webmanifest)$).*)",
  ],
};
