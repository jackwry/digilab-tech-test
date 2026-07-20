import { useCallback } from "react";
import type { Dispatch, SetStateAction } from "react";

import type { FlowEdge, FlowNode } from "@/entities/workflow";

/**
 * Returns a handler that removes the node with the given id, along with any
 * edges connected to it. No confirmation prompt (JAC-19).
 */
export function useDeleteNode(
  setNodes: Dispatch<SetStateAction<FlowNode[]>>,
  setEdges: Dispatch<SetStateAction<FlowEdge[]>>
): (id: string) => void {
  return useCallback(
    (id: string) => {
      setNodes((nodes) => nodes.filter((node) => node.id !== id));
      setEdges((edges) =>
        edges.filter((edge) => edge.source !== id && edge.target !== id)
      );
    },
    [setNodes, setEdges]
  );
}
