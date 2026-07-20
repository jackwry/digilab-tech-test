import { useCallback } from "react";
import type { Dispatch, SetStateAction } from "react";

import type { FlowNode } from "@/entities/workflow";

/**
 * Returns a handler that overwrites the label of the node with the given id.
 * Mirrors `useAddNode`'s bridging-hook shape (JAC-6).
 */
export function useUpdateNodeLabel(
  setNodes: Dispatch<SetStateAction<FlowNode[]>>
): (id: string, label: string) => void {
  return useCallback(
    (id: string, label: string) => {
      setNodes((nodes) =>
        nodes.map((node) =>
          node.id === id ? { ...node, data: { ...node.data, label } } : node
        )
      );
    },
    [setNodes]
  );
}
