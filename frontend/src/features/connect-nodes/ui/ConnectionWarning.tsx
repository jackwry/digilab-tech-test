import type { ConnectionWarningState } from "../model/useConnectionWarning";

interface ConnectionWarningProps {
  warning: ConnectionWarningState | null;
}

/**
 * A fixed, orange-background message shown just above the cursor's release
 * point when a connection is rejected. Purely presentational — visibility
 * and the 3s lifetime are owned by `useConnectionWarning`, so this component
 * never tracks the cursor itself.
 */
export function ConnectionWarning({ warning }: ConnectionWarningProps) {
  if (!warning) return null;

  return (
    <div
      role="alert"
      className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-full rounded-md bg-orange-500 px-3 py-1.5 text-sm font-medium text-white shadow-lg"
      style={{ left: warning.x, top: warning.y - 8 }}
    >
      {warning.message}
    </div>
  );
}
