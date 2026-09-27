"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { TYPE_RATE } from "@/lib/firmware";
import * as sfx from "@/lib/sound";
import { BACK_EVENT, FirmwareContext } from "./Crt";
import type { ActionResult, Block, MenuItem } from "./screen";

export type { ActionResult, Block, MenuItem };

/** Menus show at most this many rows and scroll (both games). */
const VISIBLE_ITEMS = 12;
/** FO3/NV clear the result text after iComputersResultDisplayTimeout = 5s. */
const RESULT_TIMEOUT_MS = 5000;

function blockLength(b: Block) {
  if (b.t === "line" || b.t === "text") return b.text.length;
  if (b.t === "menu") return b.items.reduce((n, i) => n + i.label.length, 0);
  return 0;
}

/** Hard-wrap text at `cols` columns, word by word (FO4 converts soft wraps to hard breaks). */
export function wrapText(text: string, cols: number): string[] {
  const out: string[] = [];
  for (const para of text.split("\n")) {
    if (para.length <= cols) {
      out.push(para);
      continue;
    }
    let line = "";
    for (const word of para.split(/(\s+)/)) {
      if ((line + word).length <= cols) {
        line += word;
        continue;
      }
      if (line.trim()) out.push(line.trimEnd());
      let w = word.trimStart();
      while (w.length > cols) {
        out.push(w.slice(0, cols));
        w = w.slice(cols);
      }
      line = w;
    }
    out.push(line.trimEnd());
  }
  return out;
}

/** Characters typed so far, advancing at `rate` chars/sec; restarts when `key` changes. */
export function useTyping(total: number, rate: number, key: string) {
  const [shown, setShown] = useState(0);
  const done = shown >= total;
  const startRef = useRef(0);

  useEffect(() => {
    setShown(0);
    startRef.current = performance.now();
  }, [key]);

  useEffect(() => {
    if (done) return;
    const id = window.setInterval(() => {
      const n = Math.floor(((performance.now() - startRef.current) / 1000) * rate);
      setShown((prev) => {
        if (n > prev) sfx.tick();
        return Math.max(prev, n);
      });
    }, 33);
    return () => window.clearInterval(id);
  }, [done, rate, key]);

  const finish = useCallback(() => {
    setShown(Number.MAX_SAFE_INTEGER);
    sfx.enter();
  }, []);
  return { shown, done, finish };
}

/** Measures how many text columns and rows fit in `box`. */
function useTextGrid(box: React.RefObject<HTMLElement | null>) {
  const [grid, setGrid] = useState<{ cols: number; rows: number } | null>(null);
  useLayoutEffect(() => {
    const measure = () => {
      const el = box.current;
      if (!el) return;
      const probe = document.createElement("span");
      probe.textContent = "M".repeat(40);
      probe.style.cssText = "position:absolute;visibility:hidden;white-space:pre";
      el.appendChild(probe);
      const rect = probe.getBoundingClientRect();
      probe.remove();
      const lineH = parseFloat(getComputedStyle(el).lineHeight) || rect.height;
      const cols = Math.max(20, Math.floor(el.clientWidth / (rect.width / 40)) - 1);
      const rows = Math.max(6, Math.floor(el.clientHeight / lineH));
      setGrid((g) => (g && g.cols === cols && g.rows === rows ? g : { cols, rows }));
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [box]);
  return grid;
}

/** Rows a block occupies before the paged text (for page sizing). */
function blockRows(b: Block, cols: number) {
  if (b.t === "line" || b.t === "text") return wrapText(b.text, cols).length;
  if (b.t === "gap" || b.t === "rule") return 1;
  return 0;
}

export function Terminal({
  blocks,
  back,
  children,
  rate,
  initialResponse,
}: {
  blocks: Block[];
  /** Where Tab / Escape goes. */
  back?: string;
  /** Rendered after the text finishes typing (forms, editors). */
  children?: ReactNode;
  rate?: number;
  initialResponse?: string;
}) {
  const firmware = useContext(FirmwareContext);
  const router = useRouter();
  const pathname = usePathname();
  const [confirming, setConfirming] = useState<MenuItem | null>(null);
  const [response, setResponse] = useState(initialResponse ?? "");
  const [busy, setBusy] = useState(false);
  const [sel, setSel] = useState(0);
  const [page, setPage] = useState(0);
  const [arrows, setArrows] = useState({ up: false, down: false });
  const cursorRef = useRef<HTMLSpanElement>(null);
  const skipClickUntil = useRef(0);
  const menuRef = useRef<HTMLUListElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // FO4 pages long "Display Text"; FO3/NV scroll it.
  const pagedIndex = firmware === "termlink" ? blocks.findIndex((b) => b.t === "text") : -1;
  const grid = useTextGrid(scrollRef);
  const pages = useMemo(() => {
    const b = blocks[pagedIndex];
    if (!b || b.t !== "text" || !grid) return null;
    const above = blocks.slice(0, pagedIndex).reduce((n, x) => n + blockRows(x, grid.cols), 0);
    const perPage = Math.max(4, grid.rows - above - 1);
    const lines = wrapText(b.text, grid.cols);
    const out: string[] = [];
    for (let i = 0; i < lines.length; i += perPage) out.push(lines.slice(i, i + perPage).join("\n"));
    return out.length ? out : [""];
  }, [blocks, pagedIndex, grid]);
  const pageCount = pages?.length ?? 1;
  const lastPage = page >= pageCount - 1;

  useEffect(() => setPage(0), [pathname]);

  const displayBlocks: Block[] = useMemo(() => {
    let list = blocks;
    if (pages && pagedIndex >= 0) {
      list = list.map((b, i) => (i === pagedIndex ? { t: "text", text: pages[Math.min(page, pages.length - 1)] } : b));
      // The list only appears once the last page has been shown.
      if (!lastPage) list = list.slice(0, pagedIndex + 1);
    }
    if (!confirming) return list;
    return [
      ...list.filter((b) => b.t !== "menu"),
      { t: "line", text: confirming.confirm ?? "" },
      {
        t: "menu",
        items: [
          { label: "Confirm", action: confirming.action },
          { label: "Cancel", action: async () => setConfirming(null) },
        ],
      },
    ];
  }, [blocks, confirming, pages, pagedIndex, page, lastPage]);

  const total = useMemo(() => displayBlocks.reduce((n, b) => n + blockLength(b), 0), [displayBlocks]);
  const typingKey = `${pathname}#${confirming ? "c" : ""}#${page}#${pages ? "p" : ""}`;
  const { shown, done, finish } = useTyping(total, rate ?? TYPE_RATE[firmware], typingKey);
  const items = useMemo(() => displayBlocks.flatMap((b) => (b.t === "menu" ? b.items : [])), [displayBlocks]);
  const selIndex = Math.min(sel, Math.max(0, items.length - 1));

  // Typed response after an action; FO3/NV clear it after 5 seconds.
  const resp = useTyping(response.length, 90, response);
  useEffect(() => {
    if (firmware !== "uos" || !response || !resp.done) return;
    const t = window.setTimeout(() => setResponse(""), RESULT_TIMEOUT_MS);
    return () => window.clearTimeout(t);
  }, [firmware, response, resp.done]);

  useEffect(() => setSel(0), [pathname, confirming]);

  useLayoutEffect(() => {
    if (!done) cursorRef.current?.scrollIntoView({ block: "nearest" });
  }, [shown, done]);

  // Keep the selection inside the 12-row window and update the scroll arrows.
  const updateArrows = useCallback(() => {
    const ul = menuRef.current;
    if (!ul) return setArrows((a) => (a.up || a.down ? { up: false, down: false } : a));
    const up = ul.scrollTop > 1;
    const down = ul.scrollTop + ul.clientHeight < ul.scrollHeight - 1;
    setArrows((a) => (a.up === up && a.down === down ? a : { up, down }));
  }, []);
  useEffect(() => {
    if (!done) return;
    const ul = menuRef.current;
    const el = ul?.children[selIndex] as HTMLElement | undefined;
    if (ul && el) {
      if (el.offsetTop < ul.scrollTop) ul.scrollTop = el.offsetTop;
      else if (el.offsetTop + el.offsetHeight > ul.scrollTop + ul.clientHeight)
        ul.scrollTop = el.offsetTop + el.offsetHeight - ul.clientHeight;
      el.scrollIntoView({ block: "nearest" });
    }
    updateArrows();
  }, [selIndex, done, updateArrows, displayBlocks]);

  const activate = useCallback(
    async (item: MenuItem) => {
      if (busy) return;
      sfx.enter();
      if (item.confirm && !confirming) {
        setConfirming(item);
        return;
      }
      if (item.href) {
        router.push(item.href);
        return;
      }
      if (!item.action) return;
      setBusy(true);
      try {
        const result = await item.action();
        setConfirming(null);
        if (result?.response) setResponse(result.response);
        if (result?.redirect) router.push(result.redirect);
        else router.refresh();
      } catch (e) {
        // Next.js redirects thrown from server actions are handled by the router.
        if (e && typeof e === "object" && "digest" in e && String((e as { digest: unknown }).digest).startsWith("NEXT_REDIRECT")) throw e;
        setResponse("ERROR: REQUEST FAILED");
        sfx.bad();
      } finally {
        setBusy(false);
      }
    },
    [busy, confirming, router],
  );

  const nextPage = useCallback(() => {
    sfx.enter();
    setPage((p) => p + 1);
  }, []);

  const goBack = useCallback(() => {
    if (confirming) {
      setConfirming(null);
      return;
    }
    if (back) {
      sfx.enter();
      router.push(back);
    }
  }, [back, confirming, router]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const editing = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA");
      if (!done) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          finish();
        }
        return;
      }
      if (editing) return;
      if (!lastPage && (e.key === "Enter" || e.key === " ")) {
        e.preventDefault();
        nextPage();
      } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        if (!items.length) return;
        e.preventDefault();
        sfx.key();
        setSel((s) => (e.key === "ArrowDown" ? Math.min(items.length - 1, s + 1) : Math.max(0, s - 1)));
      } else if (e.key === "Enter" && items[selIndex]) {
        e.preventDefault();
        void activate(items[selIndex]);
      } else if (e.key === "Tab" || e.key === "Escape") {
        e.preventDefault();
        goBack();
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener(BACK_EVENT, goBack);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(BACK_EVENT, goBack);
    };
  }, [activate, done, finish, goBack, items, selIndex, lastPage, nextPage]);

  // Render blocks, revealing `shown` characters and placing the cursor at the typing head.
  let remaining = shown;
  let cursorPlaced = false;
  let itemIndex = 0;
  const reveal = (text: string) => {
    if (cursorPlaced) return null;
    const visible = text.slice(0, Math.max(0, remaining));
    remaining -= text.length;
    const head = remaining < 0;
    if (head) cursorPlaced = true;
    return (
      <>
        {visible}
        {head && <span ref={cursorRef} className="cursor" />}
      </>
    );
  };

  const rendered = displayBlocks.map((b, i) => {
    if (cursorPlaced) return null;
    switch (b.t) {
      case "line": {
        const cls = `line${b.center ? " center" : ""}${b.dim ? " dim" : ""}${b.blink && done ? " blinking" : ""}`;
        if (b.underline && firmware === "uos") {
          // NV computers_separator: as wide as the welcome text, 10px below it.
          return (
            <div key={i} className={cls}>
              <span className="underlined">{reveal(b.text)}</span>
            </div>
          );
        }
        return (
          <div key={i} className={cls}>
            {reveal(b.text)}
          </div>
        );
      }
      case "text":
        return (
          <div key={i} className={`line${i === pagedIndex ? " paged" : ""}`}>
            {reveal(b.text)}
          </div>
        );
      case "rule":
        // FO4 terminals have no separator lines.
        return firmware === "uos" ? <div key={i} className="rule" /> : <div key={i} className="gap" />;
      case "gap":
        return <div key={i} className="gap" />;
      case "menu":
        return (
          <div key={i} className="menu-wrap">
            {done && arrows.up && <span className="scroll-arrow up" aria-hidden />}
            <ul
              className="menu"
              role="listbox"
              ref={menuRef}
              onScroll={updateArrows}
              style={{ maxHeight: `calc(${VISIBLE_ITEMS} * var(--row-h))` }}
            >
              {b.items.map((item) => {
                const idx = itemIndex++;
                if (cursorPlaced) return null;
                const selected = done && idx === selIndex;
                return (
                  <li
                    key={idx}
                    role="option"
                    aria-selected={selected}
                    className={selected ? "sel" : undefined}
                    onMouseEnter={() => {
                      if (done && idx !== selIndex) {
                        setSel(idx);
                        sfx.key();
                      }
                    }}
                    onClick={() => done && performance.now() > skipClickUntil.current && void activate(item)}
                  >
                    {reveal(item.label)}
                  </li>
                );
              })}
            </ul>
            {done && arrows.down && <span className="scroll-arrow down" aria-hidden />}
          </div>
        );
    }
  });

  return (
    <div
      className="term"
      data-typing={done ? "0" : "1"}
      onPointerDown={() => {
        if (!done) {
          skipClickUntil.current = performance.now() + 300;
          finish();
        } else if (!lastPage) {
          skipClickUntil.current = performance.now() + 300;
          nextPage();
        }
      }}
    >
      <div className="term-scroll" ref={scrollRef}>
        {rendered}
        {done && children}
      </div>
      {done && !children && (
        <div className="prompt">
          <span>&gt;</span>
          <span>
            {response.slice(0, resp.shown)}
            {busy ? "" : <span className="cursor" />}
          </span>
        </div>
      )}
    </div>
  );
}
