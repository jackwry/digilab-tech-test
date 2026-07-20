import { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";

import {
  flowToWorkflow,
  getWorkflow,
  updateWorkflow,
  useWorkflowStore,
  workflowToFlow,
} from "@/entities/workflow";
import type { WarningLevel } from "@/features/validate-workflow";
import { validateWorkflow } from "@/features/validate-workflow";
import { extractApiErrors } from "@/shared/api/errorResponse";

export type PersistenceStatus =
  "loading" | "idle" | "saving" | "saved" | "error" | "invalid" | "not-found";

function isNotFound(err: unknown): boolean {
  return axios.isAxiosError(err) && err.response?.status === 404;
}

/**
 * Loads the workflow identified by `workflowId` (the editor route's `:workflowId`
 * param — see JAC-13) and exposes a `save` action for the save button.
 *
 * `onWarning` (JAC-16) is how validation diagnostics reach the toast stack.
 * The basic workflow rules are treated as hard errors, not advisories: `save()`
 * runs the same whole-workflow rules the backend does, client-side, before
 * ever posting — if the workflow fails a rule, nothing is sent, each issue is
 * reported as an `"error"`, and the save is blocked. The backend re-checks the
 * same rules independently and rejects the request (422) if it ever disagrees
 * with the client — that shouldn't normally happen, since the client already
 * validated, but it's not trusted to be the only guard. Any other rejected
 * request (a FastAPI/Pydantic 422, a 5xx, a network failure) reports each
 * structured error — or a generic fallback if the failure has no structured
 * body — as an `"error"` too.
 */
export function useWorkflowPersistence(
  workflowId: string,
  onWarning: (message: string, level: WarningLevel) => void
): {
  status: PersistenceStatus;
  error: string | null;
  save: () => Promise<void>;
} {
  const nodes = useWorkflowStore((state) => state.nodes);
  const edges = useWorkflowStore((state) => state.edges);
  const setNodes = useWorkflowStore((state) => state.setNodes);
  const setEdges = useWorkflowStore((state) => state.setEdges);

  const [name, setName] = useState("");
  const [status, setStatus] = useState<PersistenceStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const loadedForId = useRef<string | null>(null);

  useEffect(() => {
    if (loadedForId.current === workflowId) return;
    loadedForId.current = workflowId;
    setStatus("loading");

    getWorkflow(workflowId)
      .then((workflow) => {
        setName(workflow.name);
        const flow = workflowToFlow(workflow);
        setNodes(flow.nodes);
        setEdges(flow.edges);
        setStatus("idle");
      })
      .catch((err) => {
        if (isNotFound(err)) {
          setStatus("not-found");
          return;
        }
        setStatus("error");
        setError("Failed to load the workflow.");
      });
  }, [workflowId, setNodes, setEdges]);

  const save = useCallback(async () => {
    const workflow = flowToWorkflow(nodes, edges, { name });

    const issues = validateWorkflow(workflow.nodes, workflow.edges);
    if (issues.length > 0) {
      for (const issue of issues) onWarning(issue.message, "error");
      setStatus("invalid");
      setError("Fix the highlighted issues before saving.");
      return;
    }

    setStatus("saving");
    try {
      await updateWorkflow(workflowId, workflow);
      setStatus("saved");
      setError(null);
    } catch (err) {
      const apiErrors = extractApiErrors(err);
      if (apiErrors.length > 0) {
        for (const apiError of apiErrors) onWarning(apiError.message, "error");
      } else {
        onWarning("Failed to save the workflow.", "error");
      }
      setStatus("error");
      setError("Failed to save the workflow.");
    }
  }, [workflowId, name, nodes, edges, onWarning]);

  return { status, error, save };
}
