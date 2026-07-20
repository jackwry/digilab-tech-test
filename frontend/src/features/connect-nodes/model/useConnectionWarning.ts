import { useCallback, useEffect, useRef, useState } from "react";

const WARNING_DURATION_MS = 3000;
const TRANSITION_MS = 150;

/**
 * Owns the transient "connection rejected" warning: a message plus the
 * viewport point it should appear above, self-clearing after 3s. Kept
 * separate from `useConnectNodes` so the display/timing concern is testable
 * in isolation from the validation-rule wiring.
 *
 * `phase` drives the fade/slide transition in `ConnectionWarning`: it starts
 * `"enter"` (off-screen state), flips to `"visible"` a tick later so the
 * browser has a prior frame to transition from, holds until
 * `TRANSITION_MS` before the total duration is up, then flips to `"exit"`
 * (same off-screen state as `"enter"`) so the same transition plays in
 * reverse before the warning is cleared entirely.
 */

export type ConnectionWarningPhase = "enter" | "visible" | "exit";

export interface ConnectionWarningPoint {
  x: number;
  y: number;
}

export interface ConnectionWarningState extends ConnectionWarningPoint {
  message: string;
  phase: ConnectionWarningPhase;
}

export interface UseConnectionWarningResult {
  warning: ConnectionWarningState | null;
  showWarning: (message: string, point: ConnectionWarningPoint) => void;
}

export function useConnectionWarning(): UseConnectionWarningResult {
  const [warning, setWarning] = useState<ConnectionWarningState | null>(null);
  const enterTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined
  );
  const exitTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined
  );
  const clearTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined
  );

  const clearAllTimeouts = useCallback(() => {
    clearTimeout(enterTimeoutRef.current);
    clearTimeout(exitTimeoutRef.current);
    clearTimeout(clearTimeoutRef.current);
  }, []);

  useEffect(() => clearAllTimeouts, [clearAllTimeouts]);

  const showWarning = useCallback(
    (message: string, point: ConnectionWarningPoint) => {
      clearAllTimeouts();
      setWarning({ message, ...point, phase: "enter" });

      enterTimeoutRef.current = setTimeout(() => {
        setWarning((current) =>
          current ? { ...current, phase: "visible" } : current
        );
      }, 0);

      exitTimeoutRef.current = setTimeout(() => {
        setWarning((current) =>
          current ? { ...current, phase: "exit" } : current
        );
      }, WARNING_DURATION_MS - TRANSITION_MS);

      clearTimeoutRef.current = setTimeout(() => {
        setWarning(null);
      }, WARNING_DURATION_MS);
    },
    [clearAllTimeouts]
  );

  return { warning, showWarning };
}
