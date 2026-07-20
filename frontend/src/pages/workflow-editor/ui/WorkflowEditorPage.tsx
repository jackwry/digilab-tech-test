import { AddNodeToolbar, useAddNode } from "@/features/add-node";
import {
  SaveWorkflowButton,
  useWorkflowPersistence,
} from "@/features/persist-workflow";
import { WorkflowCanvas } from "@/widgets/workflow-canvas";
import { useWorkflowStore } from "@/entities/workflow";

/**
 * The single-page workflow editor. A homepage/workflow-list page is coming in
 * a follow-up ticket, at which point routing (react-router or similar) will
 * be introduced in `app/` and this page will stop being the sole one rendered.
 */
export function WorkflowEditorPage() {
  const setNodes = useWorkflowStore((state) => state.setNodes);
  const handleAddNode = useAddNode(setNodes);
  const { status, save } = useWorkflowPersistence();

  return (
    <div className="relative h-full w-full">
      {/* TODO (candidate): a validate action (brief §C4). */}
      <div className="absolute top-3 left-3 z-10 flex flex-col items-start gap-3">
        <div className="flex items-center gap-3 rounded-lg bg-white/90 p-3 shadow">
          <h1 className="text-md font-semibold text-slate-800">
            Workflow editor
          </h1>
          <SaveWorkflowButton status={status} onSave={save} />
        </div>

        <AddNodeToolbar onAdd={handleAddNode} />
      </div>

      <WorkflowCanvas />
    </div>
  );
}
