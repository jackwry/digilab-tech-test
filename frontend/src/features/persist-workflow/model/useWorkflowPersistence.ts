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
  | "loading"
  | "idle"
  | "saving"
  | "saved"
  | "error"
  | "invalid"
  | "not-found"
  | "load-error";

/** Wait `ms` before a retry attempt (JAC-17). */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** A 5xx is treated as transient and worth retrying; every other failure
 * (422, network error, 404) is not — it won't succeed just by waiting. */
function isServerError(err: unknown): boolean {
  const httpStatus = axios.isAxiosError(err) ? err.response?.status : undefined;
  return httpStatus !== undefined && httpStatus >= 500;
}

function isNotFound(err: unknown): boolean {
  return axios.isAxiosError(err) && err.response?.status === 404;
}

/** Delays before the 1st and 2nd retry of a save that failed with a 5xx
 * (JAC-17: "retry 3 seconds after a 5xx error, and then once more 5 seconds
 * after a 5xx error"). If both retries also fail, `serverIssue` is set
 * instead of a toast. */
const RETRY_DELAYS_MS = [3000, 5000];

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
  isDirty: boolean;
  lastSavedAt: string | null;
  serverIssue: boolean;
  dismissServerIssue: () => void;
} {
  const nodes = useWorkflowStore((state) => state.nodes);
  const edges = useWorkflowStore((state) => state.edges);
  const setNodes = useWorkflowStore((state) => state.setNodes);
  const setEdges = useWorkflowStore((state) => state.setEdges);

  const [name, setName] = useState("");
  const [status, setStatus] = useState<PersistenceStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [serverIssue, setServerIssue] = useState(false);
  const loadedForId = useRef<string | null>(null);
  // The serialized `Workflow` as of the last load/save, used to derive
  // `isDirty` — `null` until the initial load completes, so nothing is
  // reported dirty before there's anything to compare against.
  const savedSnapshotRef = useRef<string | null>(null);

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
        savedSnapshotRef.current = JSON.stringify(
          flowToWorkflow(flow.nodes, flow.edges, { name: workflow.name })
        );
        setLastSavedAt(workflow.updatedAt ?? null);
        setIsDirty(false);
        setStatus("idle");
      })
      .catch((err) => {
        if (isNotFound(err)) {
          setStatus("not-found");
          return;
        }
        setStatus("load-error");
        setError("Failed to load the workflow.");
      });
  }, [workflowId, setNodes, setEdges]);

  useEffect(() => {
    if (savedSnapshotRef.current === null) return;
    const current = JSON.stringify(flowToWorkflow(nodes, edges, { name }));
    setIsDirty(current !== savedSnapshotRef.current);
  }, [nodes, edges, name]);

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
    setServerIssue(false);

    for (let attempt = 0; ; attempt++) {
      try {
        const saved = await updateWorkflow(workflowId, workflow);
        savedSnapshotRef.current = JSON.stringify(workflow);
        setIsDirty(false);
        setLastSavedAt(saved.updatedAt ?? new Date().toISOString());
        setStatus("saved");
        setError(null);
        return;
      } catch (err) {
        if (isServerError(err) && attempt < RETRY_DELAYS_MS.length) {
          await sleep(RETRY_DELAYS_MS[attempt]);
          continue;
        }
        if (isServerError(err)) {
          setServerIssue(true);
          setStatus("error");
          setError("Failed to save the workflow.");
          return;
        }
        const apiErrors = extractApiErrors(err);
        if (apiErrors.length > 0) {
          for (const apiError of apiErrors) onWarning(apiError.message, "error");
        } else {
          onWarning("Failed to save the workflow.", "error");
        }
        setStatus("error");
        setError("Failed to save the workflow.");
        return;
      }
    }
  }, [workflowId, name, nodes, edges, onWarning]);

  const dismissServerIssue = useCallback(() => setServerIssue(false), []);

  return {
    status,
    error,
    save,
    isDirty,
    lastSavedAt,
    serverIssue,
    dismissServerIssue,
  };
}
