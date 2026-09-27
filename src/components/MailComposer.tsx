"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { sendMessage } from "@/app/actions/mail";
import * as sfx from "@/lib/sound";
import { BACK_EVENT } from "./Crt";

/** Compose screen: TO / SUBJECT lines and a message body. Ctrl+S transmits, Esc cancels. */
export function MailComposer({
  slug,
  from,
  initialTo,
  initialSubject,
  initialBody,
  exitTo,
}: {
  slug: string;
  from: string;
  initialTo: string;
  initialSubject: string;
  initialBody: string;
  exitTo: string;
}) {
  const router = useRouter();
  const [to, setTo] = useState(initialTo);
  const [subject, setSubject] = useState(initialSubject);
  const [body, setBody] = useState(initialBody);
  const [status, setStatus] = useState("^S TRANSMIT   ESC CANCEL");
  const [sending, setSending] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);
  const toRef = useRef<HTMLInputElement>(null);
  const subjectRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!initialTo) toRef.current?.focus();
    else if (!initialSubject) subjectRef.current?.focus();
    else {
      bodyRef.current?.focus();
      bodyRef.current?.setSelectionRange(0, 0);
    }
  }, [initialTo, initialSubject]);

  const send = useCallback(async () => {
    if (sending) return;
    if (!to.trim()) {
      sfx.bad();
      setStatus("ERROR: RECIPIENT REQUIRED");
      toRef.current?.focus();
      return;
    }
    setSending(true);
    setStatus("Transmitting...");
    const res = await sendMessage(slug, to, subject, body);
    if (res.ok) {
      sfx.good();
      setStatus("Transmitting... ...done.");
      window.setTimeout(() => router.push(res.redirect ?? exitTo), 700);
    } else {
      sfx.bad();
      setStatus(`ERROR: ${res.error ?? "TRANSMISSION FAILED"}`);
      setSending(false);
    }
  }, [body, exitTo, router, sending, slug, subject, to]);

  const exit = useCallback(() => {
    const dirty = to !== initialTo || subject !== initialSubject || body !== initialBody;
    if (dirty && !confirmExit) {
      sfx.bad();
      setConfirmExit(true);
      setStatus("DISCARD MESSAGE? ESC AGAIN TO CONFIRM");
      return;
    }
    sfx.enter();
    router.push(exitTo);
  }, [body, confirmExit, exitTo, initialBody, initialSubject, initialTo, router, subject, to]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void send();
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
  }, [exit, send]);

  const line = (label: string, value: string, set: (v: string) => void, ref: React.RefObject<HTMLInputElement | null>, next?: () => void, max = 80) => (
    <label className="line" style={{ display: "flex" }}>
      <span>{label}</span>
      <input
        ref={ref}
        className="editor"
        style={{ flex: 1 }}
        value={value}
        maxLength={max}
        spellCheck={false}
        autoCapitalize="none"
        aria-label={label}
        onChange={(e) => {
          set(e.target.value);
          setConfirmExit(false);
          sfx.key();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            next?.();
          }
        }}
      />
    </label>
  );

  return (
    <div className="term">
      <div className="line">TERMLINK MAIL - NEW MESSAGE</div>
      <div className="line dim">FROM: {from.toUpperCase()}</div>
      {line("TO: ", to, setTo, toRef, () => subjectRef.current?.focus(), 24)}
      {line("SUBJECT: ", subject, setSubject, subjectRef, () => bodyRef.current?.focus())}
      <div className="rule" />
      <div className="term-scroll">
        <textarea
          ref={bodyRef}
          className="editor"
          aria-label="Message"
          spellCheck={false}
          value={body}
          onChange={(e) => {
            setBody(e.target.value);
            setConfirmExit(false);
            sfx.key();
          }}
        />
      </div>
      <div className="rule" />
      <div className="line">{status}</div>
      <div className="line dim" style={{ display: "flex", gap: "1.5em" }}>
        <button type="button" onClick={() => void send()} style={btn} disabled={sending}>
          [TRANSMIT]
        </button>
        <button type="button" onClick={exit} style={btn}>
          [CANCEL]
        </button>
      </div>
    </div>
  );
}

const btn: React.CSSProperties = { all: "unset", cursor: "pointer" };
