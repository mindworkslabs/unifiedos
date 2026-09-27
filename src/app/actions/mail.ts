"use server";

import { and, eq, or } from "drizzle-orm";
import { getDb } from "@/db";
import { messages, terminals, users } from "@/db/schema";
import { logEvent, requireOwner } from "@/lib/access";
import { isUuid, normalizeUsername } from "@/lib/slug";
import type { ActionResult } from "@/components/screen";

export async function sendMessage(
  slug: string,
  to: string,
  subject: string,
  body: string,
): Promise<{ ok: boolean; error?: string; redirect?: string }> {
  const { terminal, owner } = await requireOwner(slug);
  if ([to, subject, body].some((v) => typeof v !== "string")) return { ok: false, error: "INVALID INPUT" };
  const username = normalizeUsername(to).replace(/^@/, "");
  const cleanSubject = subject.replace(/\s+/g, " ").trim().slice(0, 80) || "(no subject)";
  if (!body.trim()) return { ok: false, error: "MESSAGE IS EMPTY" };
  if (body.length > 20_000) return { ok: false, error: "MESSAGE TOO LONG" };
  const db = await getDb();
  const [recipient] = await db.select().from(users).where(eq(users.username, username));
  if (!recipient) return { ok: false, error: `NO OPERATOR NAMED "${username.toUpperCase()}" ON THE NETWORK` };
  await db.insert(messages).values({ fromUserId: owner.id, toUserId: recipient.id, subject: cleanSubject, body });
  await logEvent(terminal.id, "owner", "MAIL SENT", `to ${recipient.username}: ${cleanSubject}`);
  const [theirTerminal] = await db.select().from(terminals).where(eq(terminals.ownerId, recipient.id));
  if (theirTerminal) await logEvent(theirTerminal.id, "visitor", "MAIL RECEIVED", `from ${owner.username}`);
  return { ok: true, redirect: `/${terminal.slug}/mail/sent` };
}

export async function deleteMessage(slug: string, id: string): Promise<ActionResult> {
  const { terminal, owner } = await requireOwner(slug);
  if (!isUuid(id)) return { response: "MESSAGE NOT FOUND" };
  const db = await getDb();
  const [msg] = await db
    .select()
    .from(messages)
    .where(and(eq(messages.id, id), or(eq(messages.toUserId, owner.id), eq(messages.fromUserId, owner.id))));
  if (!msg) return { response: "MESSAGE NOT FOUND" };
  const inbound = msg.toUserId === owner.id;
  await db
    .update(messages)
    .set(inbound ? { deletedByRecipient: true } : { deletedBySender: true })
    .where(eq(messages.id, id));
  return { redirect: `/${terminal.slug}/mail/${inbound ? "inbox" : "sent"}` };
}
