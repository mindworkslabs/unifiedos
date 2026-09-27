"use server";

import { hash, verify } from "@node-rs/argon2";
import { and, count, eq, gt } from "drizzle-orm";
import { getDb } from "@/db";
import { accessLog, nodes, terminals, users } from "@/db/schema";
import { getAccess, getTerminal, logEvent } from "@/lib/access";
import { getSession, getVisitorId } from "@/lib/session";
import { normalizeUsername, RESERVED_SLUGS, slugify, USERNAME_RE } from "@/lib/slug";
import type { PromptResult } from "@/components/PromptForm";
import type { ActionResult } from "@/components/screen";
import { welcomeDocuments } from "@/lib/seed";

const MAX_FAILED_LOGONS = 8;

async function tooManyFailures(terminalId: string) {
  const db = await getDb();
  const [row] = await db
    .select({ n: count() })
    .from(accessLog)
    .where(
      and(
        eq(accessLog.terminalId, terminalId),
        eq(accessLog.event, "LOGON FAILED"),
        eq(accessLog.visitorId, await getVisitorId()),
        gt(accessLog.createdAt, new Date(Date.now() - 15 * 60 * 1000)),
      ),
    );
  return (row?.n ?? 0) >= MAX_FAILED_LOGONS;
}

export async function register(values: Record<string, string>): Promise<PromptResult> {
  const username = normalizeUsername(values.username ?? "");
  const password = values.password ?? "";
  const location = (values.location ?? "").trim();

  if (!USERNAME_RE.test(username))
    return { error: "INVALID USERNAME. USE 3-24 CHARACTERS: A-Z 0-9 _", field: "username" };
  if (password.length < 8) return { error: "PASSWORD MUST BE AT LEAST 8 CHARACTERS", field: "password" };
  if (password !== values.confirm) return { error: "PASSWORDS DO NOT MATCH", field: "password" };
  const slug = slugify(location);
  if (location.length < 3 || slug.length < 3) return { error: "LOCATION NAME TOO SHORT", field: "location" };
  if (RESERVED_SLUGS.has(slug)) return { error: "LOCATION NAME RESERVED BY ROBCO. CHOOSE ANOTHER", field: "location" };

  const db = await getDb();
  if ((await db.select({ id: users.id }).from(users).where(eq(users.username, username))).length)
    return { error: "USERNAME ALREADY REGISTERED", field: "username" };
  if ((await db.select({ id: terminals.id }).from(terminals).where(eq(terminals.slug, slug))).length)
    return { error: `ADDRESS /${slug.toUpperCase()} ALREADY IN USE`, field: "location" };

  const passwordHash = await hash(password);
  const created = await db.transaction(async (tx) => {
    const [user] = await tx.insert(users).values({ username, passwordHash }).returning();
    const [terminal] = await tx
      .insert(terminals)
      .values({ ownerId: user.id, slug, name: location, welcome: location })
      .returning();
    for (const doc of welcomeDocuments(username, location, slug)) {
      await tx.insert(nodes).values({ terminalId: terminal.id, kind: "document", title: doc.title, body: doc.body });
    }
    return { user, terminal };
  });

  const session = await getSession();
  session.userId = created.user.id;
  await session.save();
  await logEvent(created.terminal.id, "owner", "TERMINAL ACTIVATED");
  return { redirect: `/${slug}`, lines: ["Account created.", `Terminal address: /${slug}`] };
}

export async function logon(values: Record<string, string>): Promise<PromptResult> {
  const username = normalizeUsername(values.username ?? "");
  const db = await getDb();
  const [row] = await db
    .select({ user: users, terminal: terminals })
    .from(users)
    .innerJoin(terminals, eq(terminals.ownerId, users.id))
    .where(eq(users.username, username));
  // Same message either way, so usernames can't be probed here.
  const denied = { error: "ACCESS DENIED. INVALID USERNAME OR PASSWORD", field: "username" };
  if (!row) return denied;
  if (await tooManyFailures(row.terminal.id)) return { error: "TOO MANY FAILED ATTEMPTS. TRY AGAIN LATER", field: "username" };
  if (!(await verify(row.user.passwordHash, values.password ?? ""))) {
    await logEvent(row.terminal.id, "visitor", "LOGON FAILED");
    return denied;
  }
  const session = await getSession();
  session.userId = row.user.id;
  await session.save();
  await logEvent(row.terminal.id, "owner", "LOGON");
  return { redirect: `/${row.terminal.slug}` };
}

/** LOGON ADMIN at a terminal's own address. */
export async function ownerLogon(slug: string, values: Record<string, string>): Promise<PromptResult> {
  const row = await getTerminal(slug);
  if (!row) return { error: "TERMINAL NOT FOUND" };
  if (await tooManyFailures(row.terminal.id)) return { error: "TOO MANY FAILED ATTEMPTS. TRY AGAIN LATER", field: "password" };
  if (!(await verify(row.owner.passwordHash, values.password ?? ""))) {
    await logEvent(row.terminal.id, "visitor", "LOGON FAILED");
    return { error: "ACCESS DENIED", field: "password" };
  }
  const session = await getSession();
  session.userId = row.owner.id;
  await session.save();
  await logEvent(row.terminal.id, "owner", "LOGON");
  return { redirect: `/${row.terminal.slug}?accepted=1` };
}

/** Log off: owners end their session; intruders drop their Termlink access to this terminal. */
export async function logoff(slug?: string): Promise<ActionResult> {
  const session = await getSession();
  if (slug) {
    const access = await getAccess(slug);
    if (access.role === "intruder" && session.intrusions) {
      delete session.intrusions[access.terminal.id];
      await session.save();
      await logEvent(access.terminal.id, "intruder", "DISCONNECTED");
      return { redirect: "/" };
    }
    if (access.role === "owner") await logEvent(access.terminal.id, "owner", "LOGOFF");
  }
  session.userId = undefined;
  await session.save();
  return { redirect: "/" };
}

export async function connect(values: Record<string, string>): Promise<PromptResult> {
  const slug = slugify((values.address ?? "").replace(/^\/+/, ""));
  if (!slug || !(await getTerminal(slug))) return { error: "NO TERMINAL RESPONDS AT THAT ADDRESS", field: "address" };
  return { redirect: `/${slug}`, lines: ["Connecting..."] };
}

export async function changePassword(values: Record<string, string>): Promise<PromptResult> {
  const session = await getSession();
  if (!session.userId) return { error: "NOT LOGGED ON" };
  const db = await getDb();
  const [user] = await db.select().from(users).where(eq(users.id, session.userId));
  if (!user || !(await verify(user.passwordHash, values.current ?? "")))
    return { error: "CURRENT PASSWORD INCORRECT", field: "current" };
  if ((values.next ?? "").length < 8) return { error: "PASSWORD MUST BE AT LEAST 8 CHARACTERS", field: "next" };
  if (values.next !== values.confirm) return { error: "PASSWORDS DO NOT MATCH", field: "next" };
  await db.update(users).set({ passwordHash: await hash(values.next) }).where(eq(users.id, user.id));
  const [t] = await db.select().from(terminals).where(eq(terminals.ownerId, user.id));
  if (t) await logEvent(t.id, "owner", "PASSWORD CHANGED");
  return { redirect: t ? `/${t.slug}/config` : "/", lines: ["Password updated."] };
}
