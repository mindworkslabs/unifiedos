"use client";

import { createContext, useEffect, useState, type ReactNode } from "react";
import type { Firmware, Phosphor } from "@/lib/firmware";
import { setSoundEnabled, soundEnabled, startHum } from "@/lib/sound";

/** Dispatch to ask the active screen to go back (same as pressing Tab). */
export const BACK_EVENT = "uos:back";

export const FirmwareContext = createContext<Firmware>("uos");

export function Crt({
  firmware,
  phosphor,
  children,
}: {
  firmware: Firmware;
  phosphor: Phosphor;
  children: ReactNode;
}) {
  const [fx, setFx] = useState(true);
  const [sound, setSound] = useState(true);

  useEffect(() => {
    try {
      setFx(localStorage.getItem("uos_fx") !== "off");
    } catch {}
    setSound(soundEnabled());
    // Browsers only allow audio after a user gesture.
    const arm = () => startHum();
    window.addEventListener("pointerdown", arm, { once: true });
    window.addEventListener("keydown", arm, { once: true });
    return () => {
      window.removeEventListener("pointerdown", arm);
      window.removeEventListener("keydown", arm);
    };
  }, []);

  const back = () => window.dispatchEvent(new Event(BACK_EVENT));
  const toggleFx = () => {
    const next = !fx;
    setFx(next);
    try {
      localStorage.setItem("uos_fx", next ? "on" : "off");
    } catch {}
  };
  const toggleSound = () => {
    const next = !sound;
    setSound(next);
    setSoundEnabled(next);
  };

  return (
    <div className="crt" data-firmware={firmware} data-phosphor={phosphor} data-fx={fx ? "on" : "off"}>
      <div className="bezel">
        <div className="screen">
          <div className="screen-inner">
            <FirmwareContext.Provider value={firmware}>{children}</FirmwareContext.Provider>
          </div>
          <div className="overlay scanlines" />
          <div className="overlay roll" />
          <div className="overlay vignette" />
          <div className="overlay glass" />
        </div>
      </div>
      <div className="hints">
        <div className="group">
          {firmware === "uos" && (
            <>
              <button type="button" onClick={back}>
                Tab) Back
              </button>
              <span>Enter) Select</span>
            </>
          )}
        </div>
        <div className="center">
          {firmware === "termlink" && (
            <button type="button" className="fo4-btn" onClick={back}>
              Tab) <b>Exit</b>
            </button>
          )}
        </div>
        <div className="group">
          <button type="button" onClick={toggleSound} aria-pressed={sound}>
            Sound: {sound ? "On" : "Off"}
          </button>
          <button type="button" onClick={toggleFx} aria-pressed={fx}>
            CRT FX: {fx ? "On" : "Off"}
          </button>
        </div>
      </div>
    </div>
  );
}
