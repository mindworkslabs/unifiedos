"use server";

import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { hackSessions, lockouts } from "@/db/schema";
import { getAccess, getLockout, logEvent } from "@/lib/access";
import { select, toPublic, type PublicBoard } from "@/lib/hack/engine";
import { secureRng } from "@/lib/hack/server";
import { getIpHash, getSession, getVisitorId, INTRUSION_MS } from "@/lib/session";
import { isUuid } from "@/lib/slug";

const PERMANENT_MS = 100 * 365 * 24 * 3600 * 1000;

export async function hackSelect(slug: string, boardId: string, pos: number): Promise<{ board: PublicBoard | null }> {
  if (!Number.isInteger(pos) || !isUuid(boardId)) return { board: null };
  const access = await getAccess(slug);
  const { terminal } = access;
  if (await getLockout(terminal.id)) return { board: null };

  const db = await getDb();
  const visitorId = await getVisitorId();
  const [row] = await db
    .select()
    .from(hackSessions)
    .where(
      and(eq(hackSessions.id, boardId), eq(hackSessions.terminalId, terminal.id), eq(hackSessions.visitorId, visitorId)),
    );
  if (!row || row.status !== "active") return { board: row ? toPublic(row.state) : null };

  const board = select(row.state, pos, { firmware: terminal.firmware, rng: secureRng });
  await db
    .update(hackSessions)
    .set({ state: board, status: board.status, updatedAt: new Date() })
    .where(eq(hackSessions.id, row.id));

  if (board.status === "success") {
    const session = await getSession();
    session.intrusions = { ...(session.intrusions ?? {}), [terminal.id]: Date.now() + INTRUSION_MS };
    // Drop expired grants so the cookie stays small.
    for (const [id, exp] of Object.entries(session.intrusions)) if (exp < Date.now()) delete session.intrusions[id];
    await session.save();
    await logEvent(terminal.id, "intruder", "HACK SUCCESS", `${4 - board.attemptsLeft} failed attempt(s)`);
  } else if (board.status === "locked") {
    const ms = terminal.lockoutSeconds > 0 ? terminal.lockoutSeconds * 1000 : PERMANENT_MS;
    const values = { terminalId: terminal.id, visitorId, ipHash: await getIpHash(), until: new Date(Date.now() + ms) };
    await db
      .insert(lockouts)
      .values(values)
      .onConflictDoUpdate({ target: [lockouts.terminalId, lockouts.visitorId], set: { until: values.until, ipHash: values.ipHash } });
    await logEvent(terminal.id, "visitor", "LOCKOUT", terminal.lockoutSeconds > 0 ? `${terminal.lockoutSeconds}s` : "until reset");
  }
  return { board: toPublic(board) };
}
