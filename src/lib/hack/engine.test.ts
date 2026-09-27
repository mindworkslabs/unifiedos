import { describe, expect, it } from "vitest";
import {
  CELLS,
  JUNK,
  MAX_ATTEMPTS,
  findBracketGroups,
  formatAddress,
  generateBoard,
  likeness,
  select,
  toPublic,
  type BoardState,
} from "./engine";

function seeded(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

describe("junk set", () => {
  it("is exactly the 30 characters from the game, without & or ~", () => {
    expect(JUNK.length).toBe(30);
    expect(new Set(JUNK).size).toBe(30);
    expect(JUNK).not.toContain("&");
    expect(JUNK).not.toContain("~");
  });
});

describe("likeness", () => {
  it("counts same-position matches", () => {
    expect(likeness("SPIES", "SPIED")).toBe(4);
    expect(likeness("FORCE", "SPIES")).toBe(0);
    expect(likeness("TRIED", "TIRED")).toBe(3);
  });
});

describe("bracket groups", () => {
  const row = (s: string) => s.padEnd(12, "#");
  it("pairs an opener with the first matching closer on the same row", () => {
    expect([...findBracketGroups(row("[#$%]"))]).toEqual([[0, 4]]);
  });
  it("counts [ [ ] as two groups and [ ] ] as one", () => {
    expect(findBracketGroups(row("[[]")).size).toBe(2);
    expect(findBracketGroups(row("[]]")).size).toBe(1);
  });
  it("rejects groups containing letters", () => {
    expect(findBracketGroups(row("(AB)")).size).toBe(0);
  });
  it("does not wrap across rows", () => {
    expect(findBracketGroups("###########(" + ")###########").size).toBe(0);
  });
  it("allows different bracket types to nest", () => {
    expect(findBracketGroups(row("{(#)}")).size).toBe(2);
  });
});

describe("generateBoard", () => {
  it.each([1, 2, 3, 4, 5])("builds a valid 408-cell board at level %i", (level) => {
    const b = generateBoard(level, seeded(level * 7));
    expect(b.grid.length).toBe(CELLS);
    expect(b.attemptsLeft).toBe(MAX_ATTEMPTS);
    expect(b.words.map((w) => w.word)).toContain(b.password);
    const len = b.password.length;
    for (const w of b.words) {
      expect(w.word.length).toBe(len);
      expect(b.grid.slice(w.start, w.start + len)).toBe(w.word);
    }
    // Words never touch each other.
    const sorted = [...b.words].sort((a, c) => a.start - c.start);
    for (let i = 1; i < sorted.length; i++) expect(sorted[i].start).toBeGreaterThan(sorted[i - 1].start + len);
    // Every non-word cell is junk.
    const letters = new Set<number>();
    for (const w of b.words) for (let i = 0; i < len; i++) letters.add(w.start + i);
    for (let i = 0; i < CELLS; i++) if (!letters.has(i)) expect(JUNK).toContain(b.grid[i]);
  });

  it("never exposes the password in the public view", () => {
    const b = generateBoard(3, seeded(1));
    expect(JSON.stringify(toPublic(b))).not.toContain(`"${b.password}"`);
    expect(toPublic(b)).not.toHaveProperty("password");
  });
});

describe("select", () => {
  function board(): BoardState {
    return generateBoard(2, seeded(42));
  }
  const dud = (b: BoardState) => b.words.find((w) => w.word !== b.password)!;

  it("logs Entry denied + x/y correct in UOS firmware and costs an attempt", () => {
    const b = board();
    const d = dud(b);
    select(b, d.start + 1, { firmware: "uos" });
    expect(b.attemptsLeft).toBe(3);
    expect(b.log).toEqual([`>${d.word}`, ">Entry denied", `>${likeness(d.word, b.password)}/${b.password.length} correct.`]);
  });

  it("logs Likeness= in Termlink firmware", () => {
    const b = board();
    const d = dud(b);
    select(b, d.start, { firmware: "termlink" });
    expect(b.log).toEqual([`>${d.word}`, ">Entry denied.", `>Likeness=${likeness(d.word, b.password)}`]);
  });

  it("succeeds on the password", () => {
    const b = board();
    const p = b.words.find((w) => w.word === b.password)!;
    select(b, p.start, { firmware: "uos" });
    expect(b.status).toBe("success");
    expect(b.log.slice(-4)).toEqual([">Exact match!", ">Please wait", ">while system", ">is accessed."]);
  });

  it("locks out after four misses", () => {
    const b = board();
    const duds = b.words.filter((w) => w.word !== b.password).slice(0, 4);
    for (const d of duds) select(b, d.start, { firmware: "uos" });
    expect(b.status).toBe("locked");
    expect(b.log.slice(-2)).toEqual([">Lockout in", ">progress."]);
    // Further input is ignored.
    const before = JSON.stringify(b);
    select(b, duds[0].start, { firmware: "uos" });
    expect(JSON.stringify(b)).toBe(before);
  });

  it("brackets remove a dud (turning it into dots) or replenish attempts, once each", () => {
    const b = board();
    const [start, end] = [...findBracketGroups(b.grid)][0];
    select(b, start, { firmware: "uos", resetChance: 0 });
    expect(b.log[0]).toBe(`>${b.grid.slice(start, end + 1)}`);
    expect(b.log[1]).toBe(">Dud removed.");
    const removed = b.words.find((w) => w.removed)!;
    expect(removed.word).not.toBe(b.password);
    expect(b.grid.slice(removed.start, removed.start + removed.word.length)).toBe(".".repeat(removed.word.length));
    // Re-using the same bracket does nothing special.
    select(b, start, { firmware: "uos" });
    expect(b.log.at(-1)).toBe(">Error");

    select(b, dud(b).start, { firmware: "uos" });
    const next = [...findBracketGroups(b.grid)].find(([s]) => !b.usedBrackets.includes(s))!;
    select(b, next[0], { firmware: "uos", resetChance: 1 });
    expect(b.attemptsLeft).toBe(MAX_ATTEMPTS);
    expect(b.log.slice(-2)).toEqual([">Allowance", ">replenished."]);
  });

  it("answers junk with Error and no attempt cost", () => {
    const b = board();
    const groups = findBracketGroups(b.grid);
    const letters = new Set(b.words.flatMap((w) => [...w.word].map((_, i) => w.start + i)));
    const pos = [...Array(CELLS).keys()].find((i) => !letters.has(i) && !groups.has(i))!;
    select(b, pos, { firmware: "termlink" });
    expect(b.attemptsLeft).toBe(MAX_ATTEMPTS);
    expect(b.log).toEqual([`>${b.grid[pos]}`, ">Error"]);
  });
});

describe("formatAddress", () => {
  it("uses 0x + four uppercase hex digits", () => {
    expect(formatAddress(0xf4f0)).toBe("0xF4F0");
  });
});

describe("firmware grid sizes", () => {
  it("builds 16-row columns for Termlink (FO4) boards", () => {
    const b = generateBoard(3, seeded(9), 16);
    expect(b.grid.length).toBe(16 * 12 * 2);
    expect(toPublic(b).rows).toBe(16);
  });
  it("defaults to 17 rows (FO3/NV)", () => {
    expect(toPublic(generateBoard(3, seeded(9))).rows).toBe(17);
  });
});
