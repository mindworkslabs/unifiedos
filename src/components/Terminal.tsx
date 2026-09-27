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

function blockLength(b: Block) {
  if (b.t === "line" || b.t === "text") return b.text.length;
  if (b.t === "menu") return b.items.reduce((n, i) => n + i.label.length, 0);
  return 0;
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
  const cursorRef = useRef<HTMLSpanElement>(null);
  const skipClickUntil = useRef(0);
  const menuRef = useRef<HTMLUListElement>(null);

  const displayBlocks: Block[] = useMemo(() => {
    if (!confirming) return blocks;
    const withoutMenus = blocks.filter((b) => b.t !== "menu");
    return [
      ...withoutMenus,
      { t: "line", text: confirming.confirm ?? "" },
      {
        t: "menu",
        items: [
          { label: "Confirm", action: confirming.action },
          { label: "Cancel", action: async () => setConfirming(null) },
        ],
      },
    ];
  }, [blocks, confirming]);

  const total = useMemo(() => displayBlocks.reduce((n, b) => n + blockLength(b), 0), [displayBlocks]);
  const { shown, done, finish } = useTyping(total, rate ?? TYPE_RATE[firmware], pathname + (confirming ? "#c" : ""));
  const items = useMemo(() => displayBlocks.flatMap((b) => (b.t === "menu" ? b.items : [])), [displayBlocks]);
  const selIndex = Math.min(sel, Math.max(0, items.length - 1));

  // Typed response after an action.
  const resp = useTyping(response.length, 90, response);

  useEffect(() => setSel(0), [pathname, confirming]);

  useLayoutEffect(() => {
    if (!done) cursorRef.current?.scrollIntoView({ block: "nearest" });
  }, [shown, done]);

  useEffect(() => {
    if (!done) return;
    const el = menuRef.current?.children[selIndex] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [selIndex, done]);

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
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
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
  }, [activate, done, finish, goBack, items, selIndex]);

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
      case "line":
        return (
          <div key={i} className={`line${b.center ? " center" : ""}${b.dim ? " dim" : ""}${b.blink && done ? " blinking" : ""}`}>
            {reveal(b.text)}
          </div>
        );
      case "text":
        return (
          <div key={i} className="line">
            {reveal(b.text)}
          </div>
        );
      case "rule":
        return <div key={i} className="rule" />;
      case "gap":
        return <div key={i} className="gap" />;
      case "menu":
        return (
          <ul key={i} className="menu" role="listbox" ref={menuRef}>
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
        }
      }}
    >
      <div className="term-scroll">
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
