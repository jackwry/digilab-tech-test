import { AddNodeToolbar, useAddNode } from "@/features/add-node";
import { useConnectNodes } from "@/features/connect-nodes";
import { useUpdateNodeLabel } from "@/features/edit-node-label";
import {
  WorkflowCanvas,
  useWorkflowCanvasState,
} from "@/widgets/workflow-canvas";

/**
 * The single-page workflow editor. A homepage/workflow-list page is coming in
 * a follow-up ticket, at which point routing (react-router or similar) will
 * be introduced in `app/` and this page will stop being the sole one rendered.
 */
export function WorkflowEditorPage() {
  const { nodes, edges, setNodes, setEdges, onNodesChange, onEdgesChange } =
    useWorkflowCanvasState();
  const handleAddNode = useAddNode(setNodes);
  const handleLabelChange = useUpdateNodeLabel(setNodes);
  const { onConnectEnd, warning: connectionWarning } = useConnectNodes(
    nodes,
    edges,
    setEdges
  );

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

      <WorkflowCanvas
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnectEnd={onConnectEnd}
        onLabelChange={handleLabelChange}
        connectionWarning={connectionWarning}
      />
    </div>
  );
}
