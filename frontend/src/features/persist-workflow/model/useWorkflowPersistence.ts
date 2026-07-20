import { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";

import {
  flowToWorkflow,
  getWorkflow,
  updateWorkflow,
  useWorkflowStore,
  workflowToFlow,
} from "@/entities/workflow";

export type PersistenceStatus =
  | "loading"
  | "idle"
  | "saving"
  | "saved"
  | "error"
  | "not-found";

function isNotFound(err: unknown): boolean {
  return axios.isAxiosError(err) && err.response?.status === 404;
}

/**
 * Loads the workflow identified by `workflowId` (the editor route's `:workflowId`
 * param — see JAC-13) and exposes a `save` action for the save button.
 *
 * Unlike the pre-JAC-13 version, this hook no longer creates a workflow on
 * load or caches a single id in `localStorage`: creation now happens once,
 * from the homepage's "New workflow" action, and every editor visit after
 * that loads an existing id from the URL.
 */
export function useWorkflowPersistence(workflowId: string): {
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
    setStatus("saving");
    try {
      await updateWorkflow(
        workflowId,
        flowToWorkflow(nodes, edges, { name })
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
