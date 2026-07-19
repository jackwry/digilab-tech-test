import { WorkflowCanvas } from "@/widgets/workflow-canvas";

/**
 * The single-page workflow editor. A homepage/workflow-list page is coming in
 * a follow-up ticket, at which point routing (react-router or similar) will
 * be introduced in `app/` and this page will stop being the sole one rendered.
 */
export function WorkflowEditorPage() {
  return (
    <div className="relative h-full w-full">
      {/* TODO (candidate): a real toolbar — add-node buttons, save, validate,
          and a clear status indicator (unsaved / saving / saved / error). */}
      <div className="absolute top-3 left-3 z-10 rounded-lg bg-white/90 p-3 shadow">
        <h1 className="text-sm font-semibold text-slate-800">
          Workflow editor
        </h1>
        <p className="mt-1 text-xs text-slate-500">
          Starter canvas — build from here.
        </p>
      </div>

      <WorkflowCanvas />
    </div>
  );
}
