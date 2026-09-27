"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { saveDocument } from "@/app/actions/files";
import * as sfx from "@/lib/sound";
import { BACK_EVENT } from "./Crt";

/** Full-screen terminal text editor. Ctrl+S saves, Esc exits. */
export function DocEditor({
  slug,
  id,
  initialTitle,
  initialBody,
  exitTo,
}: {
  slug: string;
  id: string;
  initialTitle: string;
  initialBody: string;
  exitTo: string;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(initialTitle);
  const [body, setBody] = useState(initialBody);
  const [saved, setSaved] = useState({ title: initialTitle, body: initialBody });
  const [status, setStatus] = useState("^S SAVE   ESC EXIT");
  const [confirmExit, setConfirmExit] = useState(false);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const dirty = title !== saved.title || body !== saved.body;

  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
  }, []);

  const save = useCallback(async () => {
    setStatus("Writing to tape...");
    const res = await saveDocument(slug, id, title, body);
    if (res.ok) {
      sfx.good();
      setSaved({ title, body });
      setStatus("Saved.   ^S SAVE   ESC EXIT");
      router.refresh();
    } else {
      sfx.bad();
      setStatus(`ERROR: ${res.error ?? "WRITE FAILED"}`);
    }
  }, [body, id, router, slug, title]);

  const exit = useCallback(() => {
    if (dirty && !confirmExit) {
      sfx.bad();
      setConfirmExit(true);
      setStatus("UNSAVED CHANGES. ^S SAVE, OR ESC AGAIN TO DISCARD");
      return;
    }
    sfx.enter();
    router.push(exitTo);
  }, [confirmExit, dirty, exitTo, router]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void save();
      } else if (e.key === "Escape") {
        e.preventDefault();
        exit();
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener(BACK_EVENT, exit);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(BACK_EVENT, exit);
    };
  }, [exit, save]);

  return (
    <div className="term">
      <label className="line field" style={{ display: "flex" }}>
        <span>TITLE: </span>
        <input
          className="editor"
          style={{ position: "static", opacity: 1, flex: 1 }}
          value={title}
          maxLength={60}
          aria-label="Title"
          onChange={(e) => {
            setTitle(e.target.value);
            setConfirmExit(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              bodyRef.current?.focus();
            }
          }}
        />
      </label>
      <div className="rule" />
      <div className="term-scroll">
        <textarea
          ref={bodyRef}
          className="editor"
          aria-label="Document text"
          spellCheck={false}
          value={body}
          maxLength={100_000}
          onChange={(e) => {
            setBody(e.target.value);
            setConfirmExit(false);
            sfx.key();
          }}
        />
      </div>
      <div className="rule" />
      <div className="line">
        {dirty ? "* " : ""}
        {status}
      </div>
      <div className="hints-inline line dim" style={{ display: "flex", gap: "1.5em" }}>
        <button type="button" className="line" onClick={() => void save()} style={btn}>
          [SAVE]
        </button>
        <button type="button" className="line" onClick={exit} style={btn}>
          [EXIT]
        </button>
      </div>
    </div>
  );
}

const btn: React.CSSProperties = { all: "unset", cursor: "pointer" };
