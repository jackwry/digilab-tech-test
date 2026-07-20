import type { Dispatch, SetStateAction } from "react";
import { addEdge, applyEdgeChanges, applyNodeChanges } from "@xyflow/react";
import type { OnConnect, OnEdgesChange, OnNodesChange } from "@xyflow/react";
import { create } from "zustand";

import type { FlowEdge, FlowNode } from "./flowTypes";
import { initialEdges, initialNodes } from "./initialWorkflow";

interface WorkflowState {
  nodes: FlowNode[];
  edges: FlowEdge[];
  setNodes: Dispatch<SetStateAction<FlowNode[]>>;
  setEdges: Dispatch<SetStateAction<FlowEdge[]>>;
  onNodesChange: OnNodesChange<FlowNode>;
  onEdgesChange: OnEdgesChange<FlowEdge>;
  onConnect: OnConnect;
}

/**
 * Owns the ReactFlow node/edge state for the workflow canvas (moved here
 * from a `widgets/workflow-canvas` hook in JAC-19, once a third feature
 * needed direct access to canvas state). `setNodes`/`setEdges` keep the same
 * `Dispatch<SetStateAction<T>>` shape the existing feature hooks
 * (`useAddNode`, `useUpdateNodeLabel`) already expect, so they take these as
 * parameters unchanged — only where callers source them from has moved.
 */
export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  nodes: initialNodes,
  edges: initialEdges,
  setNodes: (updater) =>
    set({
      nodes: typeof updater === "function" ? updater(get().nodes) : updater,
    }),
  setEdges: (updater) =>
    set({
      edges: typeof updater === "function" ? updater(get().edges) : updater,
    }),
  onNodesChange: (changes) =>
    set({ nodes: applyNodeChanges(changes, get().nodes) }),
  onEdgesChange: (changes) =>
    set({ edges: applyEdgeChanges(changes, get().edges) }),
  // TODO (candidate): enforce the connection rules from brief §C2 here —
  // Right now every connection is accepted.
  onConnect: (connection) => set({ edges: addEdge(connection, get().edges) }),
}));
