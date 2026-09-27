/**
 * Firmware = the look and wording of the terminal.
 * "uos"      → Fallout 3 / New Vegas RobCo Unified Operating System.
 * "termlink" → Fallout 4 / 76 RobCo Termlink.
 * See docs/research/unified-os.md §2.
 */
export type Firmware = "uos" | "termlink";
export type Phosphor = "green" | "amber" | "white" | "blue";

export const FIRMWARES: Firmware[] = ["uos", "termlink"];
export const PHOSPHORS: Phosphor[] = ["green", "amber", "white", "blue"];

export const FIRMWARE_LABEL: Record<Firmware, string> = {
  uos: "RobCo UOS (Series 3)",
  termlink: "RobCo Termlink (Series 4)",
};

export const UOS_HEADER = ["ROBCO INDUSTRIES UNIFIED OPERATING SYSTEM", "COPYRIGHT 2075-2077 ROBCO INDUSTRIES"];
export const TERMLINK_HEADER = "Welcome to ROBCO Industries (TM) Termlink";

export function serverLine(n: number) {
  return `-Server ${n}-`;
}

/** The Termlink maintenance-mode exploit script (sHackingIntro01–13). `>` lines are "typed". */
export const TERMLINK_INTRO = [
  "WELCOME TO ROBCO INDUSTRIES (TM) TERMLINK",
  "",
  ">SET TERMINAL/INQUIRE",
  "",
  "RIT-V300",
  "",
  ">SET FILE/PROTECTION=OWNER:RWED ACCOUNTS.F",
  ">SET HALT RESTART/MAINT",
  "",
  "Initializing Robco Industries(TM) MF Boot Agent v2.3.0",
  "RETROS BIOS",
  "RBIOS-4.02.08.00 52EE5.E7.E8",
  "Copyright 2201-2203 Robco Ind.",
  "Uppermem: 64 KB",
  "Root (5A8)",
  "Maintenance Mode",
  "",
  ">RUN DEBUG/ACCOUNTS.F",
];

export const PIPOS_BOOT = [
  "*************** PIP-OS(R) V7.1.0.8 ***************",
  "",
  "",
  "",
  "COPYRIGHT 2075 ROBCO(R)",
  "LOADER V1.1",
  "EXEC VERSION 41.10",
  "64K RAM SYSTEM",
  "38911 BYTES FREE",
  "NO HOLOTAPE FOUND",
  "LOAD ROM(1): DEITRIX 303",
];

export const HACK_HEADER: Record<Firmware, { title: string; subtitle: string; attempts: (n: number) => string }> = {
  uos: {
    title: "ROBCO INDUSTRIES (TM) TERMLINK PROTOCOL",
    subtitle: "ENTER PASSWORD NOW",
    attempts: (n) => `${n} ATTEMPT(S) LEFT:`,
  },
  termlink: {
    title: TERMLINK_HEADER,
    subtitle: "Password Required",
    attempts: () => "Attempts Remaining:",
  },
};

export const LOCKOUT_WARNING = "!!! WARNING: LOCKOUT IMMINENT !!!";

/** Characters per second for the typing engine (menus/notes). */
export const TYPE_RATE: Record<Firmware, number> = { uos: 150, termlink: 60 };
