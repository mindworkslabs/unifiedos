import type { Firmware } from "@/lib/firmware";

/* Screen description types, shared by server pages and the client <Terminal>. */

export interface ActionResult {
  /** Text typed after the > prompt. */
  response?: string;
  /** Navigate here afterwards. */
  redirect?: string;
}

export interface MenuItem {
  label: string;
  href?: string;
  action?: () => Promise<ActionResult | void>;
  /** Ask "Confirm / Cancel" before running the action. */
  confirm?: string;
}

export type Block =
  | { t: "line"; text: string; center?: boolean; dim?: boolean; blink?: boolean }
  | { t: "text"; text: string }
  | { t: "rule" }
  | { t: "gap" }
  | { t: "menu"; items: MenuItem[] };

/** Standard UOS / Termlink header for a location's screens. */
export function terminalHeader(opts: {
  firmware: Firmware;
  serverNo: number;
  welcome: string;
  status?: string[];
}): Block[] {
  const status: Block[] = (opts.status ?? []).map((text) => ({ t: "line", text }));
  if (opts.firmware === "termlink") {
    return [
      { t: "line", text: "Welcome to ROBCO Industries (TM) Termlink" },
      { t: "line", text: opts.welcome },
      ...status,
      { t: "gap" },
    ];
  }
  return [
    { t: "line", text: "ROBCO INDUSTRIES UNIFIED OPERATING SYSTEM", center: true },
    { t: "line", text: "COPYRIGHT 2075-2077 ROBCO INDUSTRIES", center: true },
    { t: "line", text: `-Server ${opts.serverNo}-`, center: true },
    { t: "gap" },
    { t: "line", text: opts.welcome },
    ...status,
    { t: "rule" },
  ];
}
