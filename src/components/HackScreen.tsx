"use client";

import { useRouter } from "next/navigation";
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { hackSelect } from "@/app/actions/hack";
import { HACK_HEADER, LOCKOUT_WARNING, TERMLINK_INTRO } from "@/lib/firmware";
import {
  COLUMNS,
  ROW_CHARS,
  findBracketGroups,
  formatAddress,
  type PublicBoard,
} from "@/lib/hack/engine";
import * as sfx from "@/lib/sound";
import { BACK_EVENT, FirmwareContext } from "./Crt";

/** Typed script: `>` lines are typed like an operator at a keyboard, others print fast. */
function Intro({
  onDone,
  lines = TERMLINK_INTRO,
  indent = false,
  hold = 450,
}: {
  onDone: () => void;
  lines?: string[];
  indent?: boolean;
  /** Pause after the last line before continuing. */
  hold?: number;
}) {
  const [line, setLine] = useState(0);
  const [chars, setChars] = useState(0);
  const doneRef = useRef(false);

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    onDone();
  }, [onDone]);

  useEffect(() => {
    if (line >= lines.length) {
      const t = window.setTimeout(finish, hold);
      return () => window.clearTimeout(t);
    }
    const text = lines[line];
    const typed = text.startsWith(">");
    if (chars >= text.length) {
      const t = window.setTimeout(() => {
        setLine((l) => l + 1);
        setChars(0);
      }, typed ? 220 : 40);
      return () => window.clearTimeout(t);
    }
    const t = window.setTimeout(
      () => {
        setChars((c) => c + (typed ? 1 : 4));
        if (typed) sfx.key();
        else sfx.tick();
      },
      typed ? 38 : 16,
    );
    return () => window.clearTimeout(t);
  }, [line, chars, finish, lines, hold]);

  useEffect(() => {
    const skip = (e: Event) => {
      if (e instanceof KeyboardEvent && !["Enter", " ", "Escape"].includes(e.key)) return;
      finish();
    };
    window.addEventListener("keydown", skip);
    window.addEventListener("pointerdown", skip);
    return () => {
      window.removeEventListener("keydown", skip);
      window.removeEventListener("pointerdown", skip);
    };
  }, [finish]);

  return (
    <div className="term" style={indent ? { paddingLeft: "1.5em" } : undefined}>
      {lines.slice(0, line + 1).map((text, i) => (
        <div key={i} className="line">
          {i < line ? text : text.slice(0, chars)}
          {i === line && <span className="cursor" />}
        </div>
      ))}
    </div>
  );
}

export function HackScreen({ slug, boardId, initial }: { slug: string; boardId: string; initial: PublicBoard }) {
  const firmware = useContext(FirmwareContext);
  const router = useRouter();
  const [phase, setPhase] = useState<"intro" | "dump" | "board" | "logon">(firmware === "uos" ? "intro" : "dump");
  const [board, setBoard] = useState(initial);
  const [rows, setRows] = useState(0);
  const [pos, setPos] = useState(0);
  const [busy, setBusy] = useState(false);
  const header = HACK_HEADER[firmware];
  const R = board.rows;

  const enterTerminal = useCallback(() => {
    router.push(`/${slug}`);
    router.refresh();
  }, [router, slug]);

  // Memory dump prints row by row.
  useEffect(() => {
    if (phase !== "dump") return;
    if (rows >= R) {
      setPhase("board");
      return;
    }
    const t = window.setTimeout(() => {
      setRows((r) => r + 1);
      sfx.tick();
    }, 28);
    return () => window.clearTimeout(t);
  }, [phase, rows, R]);

  const brackets = useMemo(() => findBracketGroups(board.grid), [board.grid]);

  /** Grid indices highlighted for the cursor position, and the text echoed at the prompt. */
  const highlight = useMemo(() => {
    const word = board.words.find((w) => !w.removed && pos >= w.start && pos < w.start + w.length);
    if (word) return { from: word.start, to: word.start + word.length - 1 };
    const end = brackets.get(pos);
    if (end !== undefined && !board.usedBrackets.includes(pos)) return { from: pos, to: end };
    return { from: pos, to: pos };
  }, [board, brackets, pos]);
  const echo = board.grid.slice(highlight.from, highlight.to + 1);

  const choose = useCallback(
    async (at: number) => {
      if (busy || board.status !== "active" || phase !== "board") return;
      setBusy(true);
      sfx.enter();
      try {
        const { board: next } = await hackSelect(slug, boardId, at);
        if (!next) {
          router.push(`/${slug}`);
          return;
        }
        const lostAttempt = next.attemptsLeft < board.attemptsLeft;
        setBoard(next);
        if (next.status === "success") {
          sfx.good();
          if (firmware === "uos") {
            // Vanilla holds the success text for at least 2.5s, then plays the logon intro.
            window.setTimeout(() => setPhase("logon"), 2600);
          } else {
            // FO4/76: straight to the menu, with "> Password Accepted." at the prompt.
            window.setTimeout(() => {
              router.push(`/${slug}?accepted=1`);
              router.refresh();
            }, 1800);
          }
        } else if (next.status === "locked") {
          sfx.bad();
          window.setTimeout(() => router.refresh(), 2600);
        } else if (lostAttempt) {
          sfx.bad();
        }
      } finally {
        setBusy(false);
      }
    },
    [board, boardId, busy, firmware, phase, router, slug],
  );

  useEffect(() => {
    const back = () => router.push(`/${slug}`);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Tab" || e.key === "Escape") {
        e.preventDefault();
        back();
        return;
      }
      if (phase !== "board") return;
      const col = Math.floor(pos / (ROW_CHARS * R));
      const inCol = pos % (ROW_CHARS * R);
      const row = Math.floor(inCol / ROW_CHARS);
      const x = inCol % ROW_CHARS;
      const at = (c: number, r: number, xx: number) => c * ROW_CHARS * R + r * ROW_CHARS + xx;
      let next = pos;
      if (e.key === "ArrowLeft") next = x > 0 ? pos - 1 : col > 0 ? at(col - 1, row, ROW_CHARS - 1) : pos;
      else if (e.key === "ArrowRight")
        next = x < ROW_CHARS - 1 ? pos + 1 : col < COLUMNS - 1 ? at(col + 1, row, 0) : pos;
      else if (e.key === "ArrowUp") next = row > 0 ? pos - ROW_CHARS : pos;
      else if (e.key === "ArrowDown") next = row < R - 1 ? pos + ROW_CHARS : pos;
      else if (e.key === "Enter") {
        e.preventDefault();
        void choose(pos);
        return;
      } else return;
      e.preventDefault();
      if (next !== pos) {
        sfx.key();
        setPos(next);
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener(BACK_EVENT, back);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(BACK_EVENT, back);
    };
  }, [choose, phase, pos, router, slug, R]);

  if (phase === "intro") return <Intro onDone={() => setPhase("dump")} />;
  if (phase === "logon") {
    // FO3/NV computers_intro_*: WELCOME / LOGON ADMIN / ENTER PASSWORD NOW / password, a blank line apart.
    const stars = "*".repeat(board.words[0]?.length ?? 8);
    return (
      <Intro
        indent
        hold={900}
        onDone={enterTerminal}
        lines={["WELCOME TO ROBCO INDUSTRIES (TM) TERMLINK", "", ">LOGON ADMIN", "", "ENTER PASSWORD NOW", "", `>${stars}`]}
      />
    );
  }

  if (board.status === "locked" && firmware === "uos") {
    return (
      <div className="locked">
        <div className="line">TERMINAL LOCKED</div>
        <div className="line">PLEASE CONTACT AN ADMINISTRATOR</div>
      </div>
    );
  }

  const warning = firmware === "uos" && board.attemptsLeft === 1 && board.status === "active";
  const columns = Array.from({ length: COLUMNS }, (_, c) =>
    Array.from({ length: R }, (_, r) => (c * R + r) * ROW_CHARS),
  );

  return (
    <div className="hack">
      <div className="line">{header.title}</div>
      <div className={`line${warning ? " blinking" : ""}`}>{warning ? LOCKOUT_WARNING : header.subtitle}</div>
      <div className="gap" />
      <div className="line">
        {header.attempts(board.attemptsLeft)}
        {Array.from({ length: board.attemptsLeft }, (_, i) => (
          <span key={i}>
            {" "}
            <span className="cursor" style={{ animation: "none" }} />
          </span>
        ))}
      </div>
      <div className="gap" />
      <div className="hack-grid">
        {columns.map((rowStarts, c) => (
          <div className="hack-col" key={c}>
            {rowStarts.map((start, r) =>
              r < rows ? (
                <span className="row" key={start}>
                  {formatAddress(board.baseAddress + start)}{" "}
                  {Array.from(board.grid.slice(start, start + ROW_CHARS)).map((ch, i) => {
                    const idx = start + i;
                    const lit = phase === "board" && idx >= highlight.from && idx <= highlight.to;
                    return (
                      <span
                        key={idx}
                        className={`ch${lit ? " sel" : ""}`}
                        onMouseEnter={() => {
                          if (phase === "board" && idx !== pos) {
                            setPos(idx);
                            sfx.key();
                          }
                        }}
                        onClick={() => void choose(idx)}
                      >
                        {ch}
                      </span>
                    );
                  })}
                </span>
              ) : (
                <span className="row" key={start}>
                  {" "}
                </span>
              ),
            )}
          </div>
        ))}
        <div className="hack-log" aria-live="polite">
          {board.log.map((l, i) => (
            <div key={i}>{l}</div>
          ))}
          {board.status === "locked" && firmware === "termlink" && <div>This terminal has locked you out.</div>}
          {firmware === "uos" && <div>&nbsp;</div>}
          <div>
            &gt;{board.status === "active" && phase === "board" ? echo : ""}
            <span className="cursor" />
          </div>
        </div>
      </div>
    </div>
  );
}
