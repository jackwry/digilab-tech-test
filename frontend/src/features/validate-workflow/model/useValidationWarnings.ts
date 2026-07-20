import { useCallback, useEffect, useRef, useState } from "react";

const WARNING_DURATION_MS = 5000;

/**
 * Owns the stack of validation-warning toasts shown bottom-right of the
 * editor (JAC-16): workflow-rule violations and request failures — including
 * FastAPI/Pydantic 422s — both render as `"error"`. Each toast auto-dismisses
 * after 5s unless the user closes it first via `dismiss`.
 */

export type WarningLevel = "warning" | "error";

export interface WarningToast {
  id: string;
  message: string;
  level: WarningLevel;
}

export interface UseValidationWarningsResult {
  warnings: WarningToast[];
  pushWarning: (message: string, level: WarningLevel) => void;
  dismiss: (id: string) => void;
}

let nextId = 0;

export function useValidationWarnings(): UseValidationWarningsResult {
  const [warnings, setWarnings] = useState<WarningToast[]>([]);
  const timeoutsRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  useEffect(() => {
    const timeouts = timeoutsRef.current;
    return () => {
      for (const timeout of timeouts.values()) clearTimeout(timeout);
    };
  }, []);

  const dismiss = useCallback((id: string) => {
    clearTimeout(timeoutsRef.current.get(id));
    timeoutsRef.current.delete(id);
    setWarnings((current) => current.filter((warning) => warning.id !== id));
  }, []);

  const pushWarning = useCallback(
    (message: string, level: WarningLevel) => {
      const id = `warning-${nextId++}`;
      setWarnings((current) => [...current, { id, message, level }]);
      timeoutsRef.current.set(
        id,
        setTimeout(() => dismiss(id), WARNING_DURATION_MS)
      );
    },
    [dismiss]
  );

  return { warnings, pushWarning, dismiss };
}
