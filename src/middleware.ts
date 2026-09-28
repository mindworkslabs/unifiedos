import { NextResponse, type NextRequest } from "next/server";

const VISITOR_COOKIE = "uos_vid";

/** Mirrors secureCookies() in lib/session.ts (middleware can't import server-only modules). */
function secureCookies() {
  return process.env.NODE_ENV === "production" && process.env.COOKIE_SECURE !== "false";
}

/** Give every browser an anonymous visitor id so hacking boards and lockouts can be tracked. */
export function middleware(request: NextRequest) {
  if (request.cookies.has(VISITOR_COOKIE)) return NextResponse.next();
  const id = crypto.randomUUID();
  request.cookies.set(VISITOR_COOKIE, id);
  const response = NextResponse.next({ request });
  response.cookies.set(VISITOR_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: secureCookies(),
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });
  return response;
}

export const config = {
  matcher: ["/((?!_next/|favicon.ico|fonts/).*)"],
};
