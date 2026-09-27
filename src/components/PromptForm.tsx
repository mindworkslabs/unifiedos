"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import * as sfx from "@/lib/sound";
import type { Block } from "./screen";
import { Terminal } from "./Terminal";

export interface PromptField {
  name: string;
  label: string;
  secret?: boolean;
  initial?: string;
  maxLength?: number;
}

export interface PromptResult {
  error?: string;
  /** Name of the field to re-ask after an error. */
  field?: string;
  redirect?: string;
  lines?: string[];
}

/**
 * Terminal-style sequential prompts:  >USERNAME: moira█
 * Enter moves to the next field; the last Enter submits.
 */
export function PromptForm({
  blocks,
  fields,
  submit,
  back,
  busyText = "Processing...",
}: {
  blocks: Block[];
  fields: PromptField[];
  submit: (values: Record<string, string>) => Promise<PromptResult | void>;
  back?: string;
  busyText?: string;
}) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(fields.map((f) => [f.name, f.initial ?? ""])),
  );
  const [message, setMessage] = useState<{ text: string; error: boolean }[]>([]);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, [index, busy]);

  const field = fields[index];

  async function onEnter() {
    if (busy || !field) return;
    sfx.enter();
    if (index < fields.length - 1) {
      setIndex(index + 1);
      return;
    }
    setBusy(true);
    setMessage([{ text: busyText, error: false }]);
    try {
      const result = await submit(values);
      if (result?.error) {
        sfx.bad();
        const retry = Math.max(0, fields.findIndex((f) => f.name === result.field));
        setMessage([{ text: result.error, error: true }]);
        setValues((v) => {
          const next = { ...v };
          for (const f of fields.slice(retry)) if (f.secret || f.name === result.field) next[f.name] = "";
          return next;
        });
        setIndex(retry);
        setBusy(false);
        return;
      }
      sfx.good();
      setMessage((result?.lines ?? []).map((text) => ({ text, error: false })));
      if (result?.redirect) router.push(result.redirect);
      else setBusy(false);
    } catch (e) {
      if (e && typeof e === "object" && "digest" in e) throw e;
      sfx.bad();
      setMessage([{ text: "ERROR: TERMLINK CONNECTION FAILED", error: true }]);
      setBusy(false);
    }
  }

  const shown = (f: PromptField) => (f.secret ? "*".repeat(values[f.name].length) : values[f.name]);

  return (
    <Terminal blocks={blocks} back={back}>
      <div onClick={() => inputRef.current?.focus()}>
        {fields.slice(0, index).map((f) => (
          <div className="line" key={f.name}>
            &gt;{f.label} {shown(f)}
          </div>
        ))}
        {field && !busy && (
          <label className="field line">
            <span>
              &gt;{field.label} {shown(field)}
            </span>
            <span className="cursor" />
            <input
              ref={inputRef}
              autoFocus
              aria-label={field.label}
              type={field.secret ? "password" : "text"}
              autoComplete={field.secret ? "current-password" : "off"}
              autoCapitalize="none"
              spellCheck={false}
              maxLength={field.maxLength ?? 120}
              value={values[field.name]}
              onChange={(e) => {
                sfx.key();
                setValues((v) => ({ ...v, [field.name]: e.target.value }));
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void onEnter();
                } else if ((e.key === "Escape" || e.key === "Tab") && back) {
                  e.preventDefault();
                  router.push(back);
                }
              }}
            />
          </label>
        )}
        {message.map((m, i) => (
          <div key={i} className={`line${m.error ? " blinking" : ""}`}>
            {m.text}
          </div>
        ))}
      </div>
    </Terminal>
  );
}
