import { AddNodeToolbar, useAddNode } from "@/features/add-node";
import { useWorkflowStore } from "@/entities/workflow";
import { WorkflowCanvas } from "@/widgets/workflow-canvas";

/**
 * The single-page workflow editor. A homepage/workflow-list page is coming in
 * a follow-up ticket, at which point routing (react-router or similar) will
 * be introduced in `app/` and this page will stop being the sole one rendered.
 */
export function WorkflowEditorPage() {
  const setNodes = useWorkflowStore((state) => state.setNodes);
  const handleAddNode = useAddNode(setNodes);

  return (
    <div className="relative h-full w-full">
      {/* TODO (candidate): a save/validate action, and a clear status
          indicator (unsaved / saving / saved / error). */}
      <div className="absolute top-3 left-3 z-10 flex flex-col items-start gap-3">
        <div className="rounded-lg bg-white/90 p-3 shadow">
          <h1 className="text-md font-semibold text-slate-800">
            Workflow editor
          </h1>
        </div>

        <AddNodeToolbar onAdd={handleAddNode} />
      </div>

      <WorkflowCanvas />
    </div>
  );
}
