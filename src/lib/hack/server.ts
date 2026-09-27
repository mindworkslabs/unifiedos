import "server-only";
import { randomInt } from "node:crypto";
import { and, desc, eq, gt } from "drizzle-orm";
import { getDb } from "@/db";
import { hackSessions, type Terminal } from "@/db/schema";
import { logEvent } from "@/lib/access";
import { generateBoard, ROWS_BY_FIRMWARE } from "./engine";

/** Cryptographically random [0, 1) so boards can't be predicted. */
export const secureRng = () => randomInt(0, 2 ** 32) / 2 ** 32;

/**
 * The board this visitor just solved, if within the last minute. Winning sets the session
 * cookie, which makes Next.js re-render the hack page; we keep showing the solved board so the
 * "Exact match! / Please wait / while system / is accessed." sequence can finish.
 */
export async function recentSolvedBoard(terminalId: string, visitorId: string) {
  const db = await getDb();
  const [row] = await db
    .select()
    .from(hackSessions)
    .where(
      and(
        eq(hackSessions.terminalId, terminalId),
        eq(hackSessions.visitorId, visitorId),
        eq(hackSessions.status, "success"),
        gt(hackSessions.updatedAt, new Date(Date.now() - 60_000)),
      ),
    )
    .orderBy(desc(hackSessions.updatedAt))
    .limit(1);
  return row ?? null;
}

/**
 * Returns this visitor's board for the terminal. Re-entering while a board is active
 * resets it (the classic "leave and come back" exploit) unless the owner disabled that.
 */
export async function loadOrCreateBoard(terminal: Terminal, visitorId: string) {
  const db = await getDb();
  const [existing] = await db
    .select()
    .from(hackSessions)
    .where(
      and(
        eq(hackSessions.terminalId, terminal.id),
        eq(hackSessions.visitorId, visitorId),
        eq(hackSessions.status, "active"),
      ),
    )
    .orderBy(desc(hackSessions.createdAt))
    .limit(1);

  if (existing && !terminal.exploitEnabled) return existing;
  if (existing) {
    await db.update(hackSessions).set({ status: "abandoned", updatedAt: new Date() }).where(eq(hackSessions.id, existing.id));
  }
  const state = generateBoard(terminal.securityLevel, secureRng, ROWS_BY_FIRMWARE[terminal.firmware]);
  const [created] = await db
    .insert(hackSessions)
    .values({ terminalId: terminal.id, visitorId, state, status: "active" })
    .returning();
  await logEvent(terminal.id, "visitor", existing ? "SECURITY RESET" : "MAINTENANCE MODE ENTERED");
  return created;
}
