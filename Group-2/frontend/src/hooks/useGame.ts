import { useEffect, useRef, useState, useCallback } from "react";
import { loadEngine } from "../services/engine";
import type { Engine, GameState } from "../types/engine";
export function useGame() {
  const engine = useRef<Engine | null>(null);
  const [state, setState] = useState<GameState | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [speed, setSpeed] = useState(1);
  useEffect(() => {
    let mounted = true;
    loadEngine()
      .then((e) => {
        if (mounted) {
          engine.current = e;
          setState(JSON.parse(e.initializeGame()));
        }
      })
      .catch(() =>
        setError("The WebAssembly engine could not load. Refresh to retry."),
      );
    return () => {
      mounted = false;
    };
  }, []);
  const action = useCallback((name: keyof Engine, ...args: unknown[]) => {
    if (!engine.current) return;
    try {
      const fn = engine.current[name] as (...a: unknown[]) => string;
      const result = fn(...args);
      setState(JSON.parse(engine.current.getGameState()));
      return result;
    } catch (e) {
      let message = "Command could not be completed.";
      if (e instanceof Error) message = e.message;
      else if (engine.current.getExceptionMessage) {
        try {
          message = engine.current.getExceptionMessage(e)[1];
          engine.current.decrementExceptionRefcount?.(e);
        } catch {}
      }
      setError(message);
    }
  }, []);
  useEffect(() => {
    if (state?.phase !== "running") return;
    const id = setInterval(() => action("tick"), 900 / speed);
    return () => clearInterval(id);
  }, [state?.phase, speed, action]);
  useEffect(() => {
    if (!error && !notice) return;
    const id = setTimeout(() => {
      setError("");
      setNotice("");
    }, 6500);
    return () => clearTimeout(id);
  }, [error, notice]);
  const save = () => {
    try {
      const value = engine.current?.saveGame();
      if (value) {
        localStorage.setItem("rescue-command-save", value);
        setNotice("Operation saved to this browser.");
      }
    } catch {
      setError("Browser storage is unavailable.");
    }
  };
  const load = () => {
    try {
      const data = localStorage.getItem("rescue-command-save");
      if (!data) {
        setError("No saved operation found in this browser.");
        return;
      }
      if (action("loadGame", data)) setNotice("Saved operation restored.");
    } catch {
      setError("Unable to read browser storage.");
    }
  };
  return {
    state,
    action,
    error,
    notice,
    save,
    load,
    speed,
    setSpeed,
    clearMessage: () => {
      setError("");
      setNotice("");
    },
  };
}
