import "server-only";
import { terminalHeader, type Block } from "@/components/screen";
import type { Access } from "./access";

/** Header for any screen of a location, with the read-only banner for intruders. */
export function headerFor(access: Access): Block[] {
  const { terminal, role } = access;
  const status: string[] = [];
  if (role === "intruder") {
    const mins = Math.max(1, Math.ceil(((access.intrusionEndsAt ?? 0) - Date.now()) / 60000));
    status.push(`>> MAINTENANCE MODE: READ ONLY (${mins} MIN REMAINING)`);
  }
  return terminalHeader({ firmware: terminal.firmware, serverNo: terminal.serverNo, welcome: terminal.welcome, status });
}

export function formatStamp(d: Date) {
  // In-universe dates: the year is shifted into the 2070s-2080s, e.g. 2026 → 2077+.
  const year = d.getUTCFullYear() + 51;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${year}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}
