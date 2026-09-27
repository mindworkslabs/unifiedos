import "server-only";
import { and, eq, gt, or } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { getDb } from "@/db";
import { accessLog, lockouts, terminals, users, type Terminal, type User } from "@/db/schema";
import { getIpHash, getSession, getVisitorId } from "./session";

export type Role = "owner" | "intruder";

export const getCurrentUser = cache(async (): Promise<User | null> => {
  const session = await getSession();
  if (!session.userId) return null;
  const db = await getDb();
  const [user] = await db.select().from(users).where(eq(users.id, session.userId));
  return user ?? null;
});

export const getMyTerminal = cache(async (): Promise<Terminal | null> => {
  const user = await getCurrentUser();
  if (!user) return null;
  const db = await getDb();
  const [t] = await db.select().from(terminals).where(eq(terminals.ownerId, user.id));
  return t ?? null;
});

export const getTerminal = cache(async (slug: string) => {
  const db = await getDb();
  const [row] = await db
    .select({ terminal: terminals, owner: users })
    .from(terminals)
    .innerJoin(users, eq(users.id, terminals.ownerId))
    .where(eq(terminals.slug, slug.toLowerCase()));
  return row ?? null;
});

export interface Access {
  terminal: Terminal;
  owner: User;
  role: Role | null;
  /** Epoch ms when intruder access ends. */
  intrusionEndsAt?: number;
}

export const getAccess = cache(async (slug: string): Promise<Access> => {
  const row = await getTerminal(slug);
  if (!row) notFound();
  const session = await getSession();
  if (session.userId && session.userId === row.owner.id) return { ...row, role: "owner" };
  const exp = session.intrusions?.[row.terminal.id];
  if (exp && exp > Date.now()) return { ...row, role: "intruder", intrusionEndsAt: exp };
  return { ...row, role: null };
});

/** Page guard: any logged-on role (owner or intruder) may read. */
export async function requireRead(slug: string) {
  const access = await getAccess(slug);
  if (!access.role) redirect(`/${access.terminal.slug}`);
  return access as Access & { role: Role };
}

/** Page/action guard: only the owner may write or configure. */
export async function requireOwner(slug: string) {
  const access = await getAccess(slug);
  if (access.role !== "owner") redirect(`/${access.terminal.slug}`);
  return access as Access & { role: "owner" };
}

export async function logEvent(terminalId: string, actor: "owner" | "intruder" | "visitor", event: string, detail = "") {
  const db = await getDb();
  await db.insert(accessLog).values({
    terminalId,
    actor,
    visitorId: actor === "owner" ? null : await getVisitorId(),
    event,
    detail: detail.slice(0, 200),
  });
}

/** Active lockout for this visitor (by cookie or IP), if any. */
export async function getLockout(terminalId: string) {
  const db = await getDb();
  const [row] = await db
    .select()
    .from(lockouts)
    .where(
      and(
        eq(lockouts.terminalId, terminalId),
        gt(lockouts.until, new Date()),
        or(eq(lockouts.visitorId, await getVisitorId()), eq(lockouts.ipHash, await getIpHash())),
      ),
    );
  return row ?? null;
}
