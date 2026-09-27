"use server";

import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { lockouts, terminals, type Terminal } from "@/db/schema";
import { logEvent, requireOwner } from "@/lib/access";
import { PHOSPHORS } from "@/lib/firmware";
import type { PromptResult } from "@/components/PromptForm";
import type { ActionResult } from "@/components/screen";

const LOCKOUT_CHOICES = [60, 300, 900, 3600, 0];

type Setting = "firmware" | "phosphor" | "serverNo" | "securityLevel" | "lockoutSeconds" | "exploitEnabled";

function nextValue(t: Terminal, key: Setting): Partial<Terminal> {
  const cycle = <T,>(list: readonly T[], cur: T) => list[(list.indexOf(cur) + 1) % list.length];
  switch (key) {
    case "firmware":
      return { firmware: t.firmware === "uos" ? "termlink" : "uos" };
    case "phosphor":
      return { phosphor: cycle(PHOSPHORS, t.phosphor) };
    case "serverNo":
      return { serverNo: (t.serverNo % 10) + 1 };
    case "securityLevel":
      return { securityLevel: (t.securityLevel % 5) + 1 };
    case "lockoutSeconds":
      return { lockoutSeconds: cycle(LOCKOUT_CHOICES, t.lockoutSeconds) };
    case "exploitEnabled":
      return { exploitEnabled: !t.exploitEnabled };
  }
}

export async function cycleSetting(slug: string, key: Setting): Promise<ActionResult> {
  const { terminal } = await requireOwner(slug);
  const patch = nextValue(terminal, key);
  const db = await getDb();
  await db.update(terminals).set(patch).where(eq(terminals.id, terminal.id));
  return {};
}

export async function updateWelcome(slug: string, values: Record<string, string>): Promise<PromptResult> {
  const { terminal } = await requireOwner(slug);
  const welcome = (values.welcome ?? "").replace(/\s+/g, " ").trim().slice(0, 80);
  if (!welcome) return { error: "WELCOME MESSAGE REQUIRED", field: "welcome" };
  const db = await getDb();
  await db.update(terminals).set({ welcome }).where(eq(terminals.id, terminal.id));
  return { redirect: `/${terminal.slug}/config` };
}

export async function resetLockouts(slug: string): Promise<ActionResult> {
  const { terminal } = await requireOwner(slug);
  const db = await getDb();
  await db.delete(lockouts).where(eq(lockouts.terminalId, terminal.id));
  await logEvent(terminal.id, "owner", "LOCKOUTS RESET");
  return { response: "All lockouts cleared." };
}
