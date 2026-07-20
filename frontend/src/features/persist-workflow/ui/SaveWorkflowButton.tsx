import type { PersistenceStatus } from "../model/useWorkflowPersistence";

/** Shown alongside the dirty/clean pill for statuses that need a specific
 * explanation, not just "unsaved changes" (JAC-17). */
const WARNING_TEXT: Partial<Record<PersistenceStatus, string>> = {
  error: "Failed to save",
  invalid: "Fix the issues below to save",
};

interface SaveWorkflowButtonProps {
  status: PersistenceStatus;
  isDirty: boolean;
  lastSavedAt: string | null;
  onSave: () => void;
}

function formatLastSaved(lastSavedAt: string | null): string {
  if (!lastSavedAt) return "Not saved yet";
  const time = new Date(lastSavedAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `Last saved ${time}`;
}

/** Green for saved, yellow for unsaved-but-fine, red for a save that
 * actually failed — "saving" gets a neutral color since it's neither. */
function pillColorClasses(status: PersistenceStatus, isDirty: boolean): string {
  if (status === "error" || status === "invalid") {
    return "bg-red-600 text-white";
  }
  if (status === "saving") {
    return "bg-black text-white";
  }
  return isDirty ? "bg-yellow-400 text-slate-900" : "bg-green-600 text-white";
}

export function SaveWorkflowButton({
  status,
  isDirty,
  lastSavedAt,
  onSave,
}: SaveWorkflowButtonProps) {
  const pillText =
    status === "loading" || status === "not-found"
      ? ""
      : status === "saving"
        ? "Saving…"
        : isDirty
          ? "Unsaved changes"
          : "Saved";
  const warningText = WARNING_TEXT[status];

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onSave}
        disabled={status === "loading" || status === "saving"}
        className="rounded-md bg-slate-800 px-3 py-1.5 text-sm font-medium text-white shadow disabled:cursor-not-allowed disabled:opacity-50"
      >
        Save
      </button>

      <div className="flex flex-col items-start gap-0.5">
        {pillText && (
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${pillColorClasses(status, isDirty)}`}
          >
            {pillText}
          </span>
        )}

        <span className="text-xs text-slate-500">
          {formatLastSaved(lastSavedAt)}
        </span>

        {warningText && (
          <span className="text-xs text-red-600">{warningText}</span>
        )}
      </div>
    </div>
  );
}
