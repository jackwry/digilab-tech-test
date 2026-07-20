import { useCallback } from "react";
import type { Dispatch, SetStateAction } from "react";
import {
  addEdge,
  type Connection,
  type FinalConnectionState,
  type OnConnectEnd,
} from "@xyflow/react";

import type { FlowEdge, FlowNode } from "@/entities/workflow";

import { validateConnection } from "./connectionValidation";
import {
  useConnectionWarning,
  type UseConnectionWarningResult,
} from "./useConnectionWarning";

export interface UseConnectNodesResult {
  onConnectEnd: OnConnectEnd;
  warning: UseConnectionWarningResult["warning"];
}

/** Extracts viewport coordinates from a ReactFlow connect-end event (mouse or touch). */
export function getEventPoint(event: MouseEvent | TouchEvent): {
  x: number;
  y: number;
} {
  if ("changedTouches" in event) {
    const touch = event.changedTouches[0];
    return { x: touch.clientX, y: touch.clientY };
  }
  return { x: event.clientX, y: event.clientY };
}

/**
 * Bridges ReactFlow's `onConnectEnd` to the connection-validation rules: on a
 * valid drop, commits the edge; on an invalid drop, surfaces a warning near
 * the release point instead. Mirrors `useAddNode`/`useUpdateNodeLabel`'s
 * shape — a feature hook injected with the widget's state setters.
 */
export function useConnectNodes(
  nodes: FlowNode[],
  edges: FlowEdge[],
  setEdges: Dispatch<SetStateAction<FlowEdge[]>>
): UseConnectNodesResult {
  const { warning, showWarning } = useConnectionWarning();

  const onConnectEnd = useCallback(
    (event: MouseEvent | TouchEvent, connectionState: FinalConnectionState) => {
      const { fromNode, fromHandle, toNode, toHandle } = connectionState;
      if (!fromNode || !fromHandle || !toNode || !toHandle) return;

      const connection: Connection = {
        source: fromNode.id,
        sourceHandle: fromHandle.id ?? null,
        target: toNode.id,
        targetHandle: toHandle.id ?? null,
      };

      const nodeLookup = nodes.map((node) => ({
        id: node.id,
        label: node.data.label,
        inputs: node.data.inputs,
        outputs: node.data.outputs,
      }));

      const result = validateConnection(connection, nodeLookup, edges);

      if (!result.valid) {
        showWarning(
          result.message ?? "This connection isn't allowed.",
          getEventPoint(event)
        );
        return;
      }

      setEdges((eds) => addEdge(connection, eds));
    },
    [nodes, edges, setEdges, showWarning]
  );

  return { onConnectEnd, warning };
}
