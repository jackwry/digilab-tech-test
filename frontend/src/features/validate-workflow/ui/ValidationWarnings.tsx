import type { WarningToast } from "../model/useValidationWarnings";

interface ValidationWarningsProps {
  warnings: WarningToast[];
  onDismiss: (id: string) => void;
}

const LEVEL_CLASSES: Record<WarningToast["level"], string> = {
  warning: "border-orange-300 bg-orange-50 text-orange-900",
  error: "border-red-300 bg-red-50 text-red-900",
};

/**
 * Stacked toasts, bottom-right of the viewport (JAC-16): workflow-rule
 * violations and request failures each get their own dismissible notice,
 * newest at the bottom. Auto-dismiss timing lives in `useValidationWarnings`
 * — this component only renders the current list and forwards clicks on the
 * close button.
 */
export function ValidationWarnings({
  warnings,
  onDismiss,
}: ValidationWarningsProps) {
  if (warnings.length === 0) return null;

  return (
    <div className="fixed right-4 bottom-4 z-50 flex w-80 flex-col gap-2">
      {warnings.map((warning) => (
        <div
          key={warning.id}
          role="alert"
          data-level={warning.level}
          className={`relative rounded-md border px-3 py-2 pr-8 text-sm shadow-lg ${LEVEL_CLASSES[warning.level]}`}
        >
          {warning.message}
          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => onDismiss(warning.id)}
            className="absolute top-1.5 right-1.5 text-xs leading-none opacity-60 hover:opacity-100"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
