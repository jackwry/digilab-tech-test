import { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";

import type { Workflow } from "@/entities/workflow";
import {
  createWorkflow,
  flowToWorkflow,
  getWorkflow,
  initialEdges,
  initialNodes,
  updateWorkflow,
  useWorkflowStore,
  workflowToFlow,
} from "@/entities/workflow";

/**
 * Client-generated "local id" sent on create, distinct from the
 * server-assigned `id` (see `Workflow.lid`). Fixed rather than random
 * because this editor only ever has one workflow open at a time — there's
 * no workflow picker yet for it to disambiguate between; a future
 * multi-workflow editor would generate one per document instead.
 */
export const WORKFLOW_LID = "workflow-editor-demo";

/** Caches the server-assigned id across page reloads, since the backend
 * doesn't look workflows up by `lid` — without this every reload would
 * create a new row instead of finding the one from last time. */
export const STORAGE_KEY = "workflow-editor:workflow-id";

const DEFAULT_NAME = "Untitled workflow";

export type PersistenceStatus =
  "loading" | "idle" | "saving" | "saved" | "error";

function isNotFound(err: unknown): boolean {
  return axios.isAxiosError(err) && err.response?.status === 404;
}

function createInitialWorkflow(): Promise<Workflow> {
  return createWorkflow(
    flowToWorkflow(initialNodes, initialEdges, {
      name: DEFAULT_NAME,
      lid: WORKFLOW_LID,
    })
  );
}

async function fetchOrCreateWorkflow(
  cachedId: string | null
): Promise<Workflow> {
  if (!cachedId) return createInitialWorkflow();

  try {
    return await getWorkflow(cachedId);
  } catch (err) {
    if (isNotFound(err)) return createInitialWorkflow();
    throw err;
  }
}

/**
 * Loads (or, on first run / a stale cached id, creates) the single workflow
 * this editor works on, and exposes a `save` action for the save button.
 * See the JAC-12 decision log follow-up for why there's no proper
 * multi-workflow support yet.
 */
export function useWorkflowPersistence(): {
  status: PersistenceStatus;
  error: string | null;
  save: () => Promise<void>;
} {
  const nodes = useWorkflowStore((state) => state.nodes);
  const edges = useWorkflowStore((state) => state.edges);
  const setNodes = useWorkflowStore((state) => state.setNodes);
  const setEdges = useWorkflowStore((state) => state.setEdges);

  const [workflowId, setWorkflowId] = useState<string | null>(null);
  const [name, setName] = useState(DEFAULT_NAME);
  const [status, setStatus] = useState<PersistenceStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const hasStartedLoad = useRef(false);

  useEffect(() => {
    if (hasStartedLoad.current) return;
    hasStartedLoad.current = true;

    fetchOrCreateWorkflow(localStorage.getItem(STORAGE_KEY))
      .then((workflow) => {
        if (workflow.id) localStorage.setItem(STORAGE_KEY, workflow.id);
        setWorkflowId(workflow.id ?? null);
        setName(workflow.name);
        const flow = workflowToFlow(workflow);
        setNodes(flow.nodes);
        setEdges(flow.edges);
        setStatus("idle");
      })
      .catch(() => {
        setStatus("error");
        setError("Failed to load the workflow.");
      });
  }, [setNodes, setEdges]);

  const save = useCallback(async () => {
    if (!workflowId) return;
    setStatus("saving");
    try {
      await updateWorkflow(
        workflowId,
        flowToWorkflow(nodes, edges, { name, lid: WORKFLOW_LID })
      );
      setStatus("saved");
      setError(null);
    } catch {
      setStatus("error");
      setError("Failed to save the workflow.");
    }
  }, [workflowId, name, nodes, edges]);

  return { status, error, save };
}
