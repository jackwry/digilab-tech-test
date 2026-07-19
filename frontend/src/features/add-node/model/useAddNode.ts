import { useCallback } from "react";
import type { Dispatch, SetStateAction } from "react";

import { createFlowNode } from "@/entities/workflow";
import type { FlowNode, NodeType } from "@/entities/workflow";

import { nextNodePosition } from "./placement";

/**
 * Returns a handler that appends a new node of the given type to the
 * canvas's node state.
 */
export function useAddNode(
  setNodes: Dispatch<SetStateAction<FlowNode[]>>
): (nodeType: NodeType) => void {
  return useCallback(
    (nodeType: NodeType) => {
      setNodes((nodes) => [
        ...nodes,
        createFlowNode({ nodeType, position: nextNodePosition(nodes) }),
      ]);
    },
    [setNodes]
  );
}
