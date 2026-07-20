import type { ConnectionWarningState } from "../model/useConnectionWarning";

interface ConnectionWarningProps {
  warning: ConnectionWarningState | null;
}

/**
 * A fixed, orange-background message shown just above the cursor's release
 * point when a connection is rejected. Purely presentational — visibility,
 * the 3s lifetime, and the enter/visible/exit phase are owned by
 * `useConnectionWarning`, so this component never tracks the cursor itself.
 *
 * Fades and slides in on `"enter"` -> `"visible"`, and reverses the same
 * transition on `"visible"` -> `"exit"`: the off-screen states sit 50% of
 * the badge's own height below its resting position, so it slides up by
 * half its height while fading in, and back down by half its height while
 * fading out.
 */
export function ConnectionWarning({ warning }: ConnectionWarningProps) {
  if (!warning) return null;

  const isVisible = warning.phase === "visible";

  return (
    <div
      role="alert"
      className={`pointer-events-none fixed z-50 -translate-x-1/2 rounded-md bg-orange-500 px-3 py-1.5 text-sm font-medium text-white shadow-lg transition-[opacity,transform] duration-150 ease-out ${
        isVisible
          ? "-translate-y-full opacity-100"
          : "-translate-y-1/2 opacity-0"
      }`}
      style={{ left: warning.x, top: warning.y - 8 }}
    >
      {warning.message}
    </div>
  );
}
