import type { PersistenceStatus } from "../model/useWorkflowPersistence";

const STATUS_TEXT: Record<PersistenceStatus, string> = {
  loading: "Loading…",
  idle: "",
  saving: "Saving…",
  saved: "Saved",
  error: "Failed to save",
};

interface SaveWorkflowButtonProps {
  status: PersistenceStatus;
  onSave: () => void;
}

export function SaveWorkflowButton({
  status,
  onSave,
}: SaveWorkflowButtonProps) {
  const statusText = STATUS_TEXT[status];

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
      {statusText && (
        <span
          className={`text-xs ${
            status === "error" ? "text-red-600" : "text-slate-500"
          }`}
        >
          {statusText}
        </span>
      )}
    </div>
  );
}
