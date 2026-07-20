import { useEdgesState, useNodesState } from "@xyflow/react";

import type { FlowEdge, FlowNode } from "@/entities/workflow";

import { initialEdges, initialNodes } from "./initialWorkflow";

/**
 * Owns the ReactFlow node/edge state for the workflow canvas. Split out from
 * `WorkflowCanvas` so state can be shared with sibling UI (e.g. the "Add
 * Node" trigger, which lives in the page's title panel rather than the
 * canvas itself). `setEdges` is exposed (mirroring `setNodes`) so the
 * `connect-nodes` feature can own connection validation (JAC-10) rather than
 * this hook reaching into that concern itself.
 */
export function useWorkflowCanvasState() {
  const [nodes, setNodes, onNodesChange] =
    useNodesState<FlowNode>(initialNodes);
  const [edges, setEdges, onEdgesChange] =
    useEdgesState<FlowEdge>(initialEdges);

  return { nodes, edges, setNodes, setEdges, onNodesChange, onEdgesChange };
}
