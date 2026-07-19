import { useCallback } from "react";
import {
  addEdge,
  useEdgesState,
  useNodesState,
  type Connection,
} from "@xyflow/react";

import type { FlowEdge, FlowNode } from "@/entities/workflow";

import { initialEdges, initialNodes } from "./initialWorkflow";

/**
 * Owns the ReactFlow node/edge state for the workflow canvas. Split out from
 * `WorkflowCanvas` so state can be shared with sibling UI (e.g. the "Add
 * Node" trigger, which lives in the page's title panel rather than the
 * canvas itself).
 */
export function useWorkflowCanvasState() {
  const [nodes, setNodes, onNodesChange] =
    useNodesState<FlowNode>(initialNodes);
  const [edges, setEdges, onEdgesChange] =
    useEdgesState<FlowEdge>(initialEdges);

  // TODO (candidate): enforce the connection rules from brief §C2 here —
  // Right now every connection is accepted.
  const onConnect = useCallback(
    (connection: Connection) => setEdges((eds) => addEdge(connection, eds)),
    [setEdges]
  );

  return { nodes, edges, setNodes, onNodesChange, onEdgesChange, onConnect };
}
