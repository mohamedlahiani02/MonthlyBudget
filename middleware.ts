import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";

const PUBLIC_PATHS = ["/login", "/api/auth/login"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isPublic = PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const authed = await verifySessionToken(token);

  // Redirect authed users away from the login page.
  if (pathname === "/login" && authed) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  if (isPublic) return NextResponse.next();

  if (!authed) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const url = new URL("/login", req.url);
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
