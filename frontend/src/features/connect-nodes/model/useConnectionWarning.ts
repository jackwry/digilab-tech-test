import { useCallback, useEffect, useRef, useState } from "react";

const WARNING_DURATION_MS = 3000;

/**
 * Owns the transient "connection rejected" warning: a message plus the
 * viewport point it should appear above, self-clearing after 3s. Kept
 * separate from `useConnectNodes` so the display/timing concern is testable
 * in isolation from the validation-rule wiring.
 */

export interface ConnectionWarningPoint {
  x: number;
  y: number;
}

export interface ConnectionWarningState extends ConnectionWarningPoint {
  message: string;
}

export interface UseConnectionWarningResult {
  warning: ConnectionWarningState | null;
  showWarning: (message: string, point: ConnectionWarningPoint) => void;
}

export function useConnectionWarning(): UseConnectionWarningResult {
  const [warning, setWarning] = useState<ConnectionWarningState | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined
  );

  useEffect(() => () => clearTimeout(timeoutRef.current), []);

  const showWarning = useCallback(
    (message: string, point: ConnectionWarningPoint) => {
      clearTimeout(timeoutRef.current);
      setWarning({ message, ...point });
      timeoutRef.current = setTimeout(
        () => setWarning(null),
        WARNING_DURATION_MS
      );
    },
    []
  );

  return { warning, showWarning };
}
