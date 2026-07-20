interface ServerErrorDialogProps {
  onDismiss: () => void;
}

/**
 * Shown when a save has failed with a 5xx twice in a row, after both
 * automatic retries were exhausted (JAC-17) — at that point this looks like
 * a genuine outage rather than something a toast should quietly retry
 * again, so it interrupts with an explanation instead.
 */
export function ServerErrorDialog({ onDismiss }: ServerErrorDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="server-error-dialog-title"
        className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl"
      >
        <h2
          id="server-error-dialog-title"
          className="text-md font-semibold text-slate-800"
        >
          We're having trouble saving
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          There's a problem on our end right now, and your latest changes
          haven't been saved. We're looking into it — please bear with us and
          try again shortly.
        </p>
        <button
          type="button"
          onClick={onDismiss}
          className="mt-4 rounded-md bg-slate-800 px-3 py-1.5 text-sm font-medium text-white shadow"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
