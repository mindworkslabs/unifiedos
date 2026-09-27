/**
 * RobCo Termlink hacking engine.
 *
 * Pure and deterministic given an RNG, so it can run on the server (the source
 * of truth) and be unit-tested. Mechanics follow docs/research/unified-os.md §S4.
 */
import type { Firmware } from "@/lib/firmware";
import WORDS from "./words.json";

export const ROW_CHARS = 12;
export const ROWS_PER_COLUMN = 17;
export const COLUMNS = 2;
export const CELLS = ROW_CHARS * ROWS_PER_COLUMN * COLUMNS; // 408
export const MAX_ATTEMPTS = 4;
export const LOG_LINES = ROWS_PER_COLUMN - 1;

/** The exact 30-character junk set from the New Vegas executable (no & or ~). */
export const JUNK = "!@#$%^*()_+=-`[]{}|;':,./<>?\\\"";
const OPENERS = "([{<";
const CLOSERS = ")]}>";

export type Rng = () => number;

export interface PlacedWord {
  start: number;
  word: string;
  removed: boolean;
}

export interface BoardState {
  grid: string;
  baseAddress: number;
  words: PlacedWord[];
  password: string;
  attemptsLeft: number;
  usedBrackets: number[];
  resetUsed: boolean;
  status: "active" | "success" | "locked";
  log: string[];
}

/** What the browser is allowed to see: everything except the password. */
export interface PublicBoard {
  grid: string;
  baseAddress: number;
  words: { start: number; length: number; removed: boolean }[];
  usedBrackets: number[];
  attemptsLeft: number;
  maxAttempts: number;
  status: BoardState["status"];
  log: string[];
}

export interface SecurityLevel {
  lengths: [number, number];
  count: number;
}

/** Owner-configured security level → word length range and number of candidate words. */
export const SECURITY_LEVELS: Record<number, SecurityLevel> = {
  1: { lengths: [4, 5], count: 8 },
  2: { lengths: [6, 7], count: 10 },
  3: { lengths: [8, 9], count: 12 },
  4: { lengths: [10, 11], count: 14 },
  5: { lengths: [12, 13], count: 16 },
};

const WORDS_BY_LENGTH = WORDS as Record<string, string[]>;

function randInt(rng: Rng, min: number, max: number) {
  return min + Math.floor(rng() * (max - min + 1));
}

export function likeness(a: string, b: string) {
  let n = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) if (a[i] === b[i]) n++;
  return n;
}

/** Pick the password plus decoys biased toward high likeness, so feedback is informative. */
export function pickWords(rng: Rng, length: number, count: number, pool = WORDS_BY_LENGTH[String(length)]) {
  const password = pool[Math.floor(rng() * pool.length)];
  const chosen = new Set<string>([password]);
  const candidates: { w: string; weight: number }[] = [];
  for (let i = 0; i < Math.min(pool.length, 400); i++) {
    const w = pool[Math.floor(rng() * pool.length)];
    if (!chosen.has(w)) candidates.push({ w, weight: (likeness(w, password) + 0.35) ** 2 });
  }
  while (chosen.size < count && candidates.length) {
    const total = candidates.reduce((s, c) => s + c.weight, 0);
    let r = rng() * total;
    let idx = 0;
    for (; idx < candidates.length - 1; idx++) {
      r -= candidates[idx].weight;
      if (r <= 0) break;
    }
    chosen.add(candidates[idx].w);
    candidates.splice(idx, 1);
  }
  return { password, words: [...chosen] };
}

function isLetter(ch: string) {
  return ch >= "A" && ch <= "Z";
}

/**
 * A bracket group is an opener followed by the first matching closer later on the
 * same 12-character row, with no letters in between. Returns start → end (inclusive).
 */
export function findBracketGroups(grid: string): Map<number, number> {
  const groups = new Map<number, number>();
  for (let row = 0; row < grid.length / ROW_CHARS; row++) {
    const rowStart = row * ROW_CHARS;
    for (let i = rowStart; i < rowStart + ROW_CHARS; i++) {
      const kind = OPENERS.indexOf(grid[i]);
      if (kind < 0) continue;
      for (let j = i + 1; j < rowStart + ROW_CHARS; j++) {
        if (isLetter(grid[j])) break;
        if (grid[j] === CLOSERS[kind]) {
          groups.set(i, j);
          break;
        }
      }
    }
  }
  return groups;
}

function junkChar(rng: Rng) {
  return JUNK[Math.floor(rng() * JUNK.length)];
}

export function generateBoard(level: number, rng: Rng = Math.random): BoardState {
  const cfg = SECURITY_LEVELS[level] ?? SECURITY_LEVELS[3];
  const length = randInt(rng, cfg.lengths[0], cfg.lengths[1]);
  const { password, words } = pickWords(rng, length, cfg.count);

  // Shuffle so the password isn't always first.
  for (let i = words.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [words[i], words[j]] = [words[j], words[i]];
  }

  for (let tries = 0; ; tries++) {
    const cells: string[] = Array.from({ length: CELLS }, () => junkChar(rng));
    // One word per equal segment, with at least one junk char separating words.
    const segment = Math.floor(CELLS / words.length);
    const placed: PlacedWord[] = words.map((word, k) => {
      const slack = segment - word.length - 1;
      const start = k * segment + randInt(rng, 0, Math.max(0, slack));
      for (let c = 0; c < word.length; c++) cells[start + c] = word[c];
      return { start, word, removed: false };
    });
    const grid = cells.join("");
    const groups = findBracketGroups(grid);
    if ((groups.size >= 4 && groups.size <= 14) || tries > 50) {
      return {
        grid,
        baseAddress: 0xf000 + randInt(rng, 0, 0x900 / 4) * 4,
        words: placed,
        password,
        attemptsLeft: MAX_ATTEMPTS,
        usedBrackets: [],
        resetUsed: false,
        status: "active",
        log: [],
      };
    }
  }
}

export function toPublic(board: BoardState): PublicBoard {
  return {
    grid: board.grid,
    baseAddress: board.baseAddress,
    words: board.words.map((w) => ({ start: w.start, length: w.word.length, removed: w.removed })),
    usedBrackets: board.usedBrackets,
    attemptsLeft: board.attemptsLeft,
    maxAttempts: MAX_ATTEMPTS,
    status: board.status,
    log: board.log,
  };
}

const STRINGS = {
  uos: {
    denied: ">Entry denied",
    likeness: (n: number, len: number) => `>${n}/${len} correct.`,
    success: [">Exact match!", ">Please wait", ">while system", ">is accessed."],
    dud: [">Dud removed."],
    reset: [">Allowance", ">replenished."],
    junk: [">Error"],
    lockout: [">Lockout in", ">progress."],
  },
  termlink: {
    denied: ">Entry denied.",
    likeness: (n: number) => `>Likeness=${n}`,
    success: [">Password Accepted."],
    dud: [">Dud Removed."],
    reset: [">Tries Reset."],
    junk: [">Error"],
    lockout: [">Init Lockout"],
  },
} as const;

function pushLog(board: BoardState, lines: readonly string[]) {
  board.log = [...board.log, ...lines].slice(-LOG_LINES);
}

/** The word (if any) covering a grid position. */
export function wordAt(board: Pick<BoardState, "words">, pos: number) {
  return board.words.find((w) => !w.removed && pos >= w.start && pos < w.start + w.word.length);
}

export interface SelectOptions {
  firmware: Firmware;
  rng?: Rng;
  /** Probability that a bracket resets attempts instead of removing a dud. */
  resetChance?: number;
}

/** Apply a selection at grid position `pos`. Mutates and returns the board. */
export function select(board: BoardState, pos: number, opts: SelectOptions): BoardState {
  if (board.status !== "active" || pos < 0 || pos >= CELLS) return board;
  const s = STRINGS[opts.firmware];
  const rng = opts.rng ?? Math.random;

  const word = wordAt(board, pos);
  if (word) {
    if (word.word === board.password) {
      board.status = "success";
      pushLog(board, [`>${word.word}`, ...s.success]);
      return board;
    }
    board.attemptsLeft -= 1;
    const n = likeness(word.word, board.password);
    pushLog(board, [`>${word.word}`, s.denied, s.likeness(n, board.password.length)]);
    if (board.attemptsLeft <= 0) {
      board.status = "locked";
      pushLog(board, s.lockout);
    }
    return board;
  }

  const groups = findBracketGroups(board.grid);
  const end = groups.get(pos);
  if (end !== undefined && !board.usedBrackets.includes(pos)) {
    board.usedBrackets.push(pos);
    const echo = `>${board.grid.slice(pos, end + 1)}`;
    const duds = board.words.filter((w) => !w.removed && w.word !== board.password);
    const canReset = !board.resetUsed && board.attemptsLeft < MAX_ATTEMPTS;
    if (canReset && (duds.length === 0 || rng() < (opts.resetChance ?? 0.25))) {
      board.resetUsed = true;
      board.attemptsLeft = MAX_ATTEMPTS;
      pushLog(board, [echo, ...s.reset]);
    } else if (duds.length > 0) {
      const dud = duds[Math.floor(rng() * duds.length)];
      dud.removed = true;
      board.grid =
        board.grid.slice(0, dud.start) + ".".repeat(dud.word.length) + board.grid.slice(dud.start + dud.word.length);
      pushLog(board, [echo, ...s.dud]);
    } else {
      pushLog(board, [echo, s.denied]);
    }
    return board;
  }

  pushLog(board, [`>${board.grid[pos]}`, ...s.junk]);
  return board;
}

export function formatAddress(n: number) {
  return "0x" + n.toString(16).toUpperCase().padStart(4, "0");
}
