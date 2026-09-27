import "server-only";
import { createHash } from "node:crypto";
import { cookies, headers } from "next/headers";
import { getIronSession, type SessionOptions } from "iron-session";

export interface SessionData {
  userId?: string;
  /** terminalId → epoch ms when the intruder's Termlink access expires. */
  intrusions?: Record<string, number>;
}

const DEV_SECRET = "dev-only-secret-change-me-dev-only-secret-change-me";

function sessionOptions(): SessionOptions {
  const password = process.env.SESSION_SECRET ?? DEV_SECRET;
  if (password === DEV_SECRET && process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET must be set in production (32+ random characters).");
  }
  return {
    password,
    cookieName: "uos_session",
    cookieOptions: { secure: process.env.NODE_ENV === "production", sameSite: "lax", httpOnly: true },
  };
}

export async function getSession() {
  return getIronSession<SessionData>(await cookies(), sessionOptions());
}

export const VISITOR_COOKIE = "uos_vid";

/** Anonymous per-browser id (set by middleware) used for hacking boards and lockouts. */
export async function getVisitorId() {
  return (await cookies()).get(VISITOR_COOKIE)?.value ?? "anonymous";
}

export async function getIpHash() {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
  return createHash("sha256")
    .update(ip + (process.env.SESSION_SECRET ?? DEV_SECRET))
    .digest("hex")
    .slice(0, 32);
}

/** How long a successful hack grants read-only access. */
export const INTRUSION_MS = 30 * 60 * 1000;
