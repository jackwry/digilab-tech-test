import { Link, useParams } from "react-router-dom";

import { AddNodeToolbar, useAddNode } from "@/features/add-node";
import {
  SaveWorkflowButton,
  ServerErrorDialog,
  useWorkflowPersistence,
} from "@/features/persist-workflow";
import { useValidationWarnings, ValidationWarnings } from "@/features/validate-workflow";
import { WorkflowCanvas } from "@/widgets/workflow-canvas";
import { useWorkflowStore } from "@/entities/workflow";

/** The workflow editor for a single workflow, identified by the `:workflowId`
 * route param (JAC-13). */
export function WorkflowEditorPage() {
  const { workflowId } = useParams<{ workflowId: string }>();
  const setNodes = useWorkflowStore((state) => state.setNodes);
  const handleAddNode = useAddNode(setNodes);
  const { warnings, pushWarning, dismiss } = useValidationWarnings();
  const {
    status,
    save,
    isDirty,
    lastSavedAt,
    serverIssue,
    dismissServerIssue,
  } = useWorkflowPersistence(workflowId!, pushWarning);

  if (status === "not-found") {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-3">
        <p className="text-slate-700">This workflow no longer exists.</p>
        <Link to="/" className="text-sm font-medium text-slate-800 underline">
          Back to workflows
        </Link>
      </div>
    );
  }

  if (status === "load-error") {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-3">
        <p className="text-slate-700">
          Something went wrong loading this workflow.
        </p>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-md bg-slate-800 px-3 py-1.5 text-sm font-medium text-white shadow"
          >
            Try again
          </button>
          <Link
            to="/"
            className="text-sm font-medium text-slate-800 underline"
          >
            Back to workflows
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <div className="absolute top-3 left-3 z-10 flex flex-col items-start gap-3">
        <div className="flex items-center gap-3 rounded-lg bg-white/90 p-3 shadow">
          <Link to="/" className="text-sm text-slate-500 hover:underline">
            ← Workflows
          </Link>
          <h1 className="text-md font-semibold text-slate-800">
            Workflow editor
          </h1>
        </div>

        <div className="flex items-center gap-3 rounded-lg bg-white/90 p-2 shadow">
          <SaveWorkflowButton
            status={status}
            isDirty={isDirty}
            lastSavedAt={lastSavedAt}
            onSave={save}
          />
        </div>

        <AddNodeToolbar onAdd={handleAddNode} />
      </div>

      <WorkflowCanvas />
      <ValidationWarnings warnings={warnings} onDismiss={dismiss} />
      {serverIssue && <ServerErrorDialog onDismiss={dismissServerIssue} />}
    </div>
  );
}
