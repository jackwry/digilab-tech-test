import { v4 as uuid } from "uuid";

import type { NodeType } from "@/types/workflow";

import type { FlowNode } from "./flowTypes";
import { NODE_DEFINITIONS } from "./nodeDefinitions";

const clone = <T>(value: T): T => structuredClone(value);

interface CreateFlowNodeArgs {
  nodeType: NodeType;
  position: FlowNode["position"];
  label?: string;
  id?: string;
}

/** Build a correctly-shaped ReactFlow node for the given node type. */
export function createFlowNode({
  nodeType,
  position,
  label,
  id = uuid(),
}: CreateFlowNodeArgs): FlowNode {
  const definition = NODE_DEFINITIONS[nodeType];

  return {
    id,
    type: "workflowNode",
    position,
    data: {
      label: label ?? nodeType,
      nodeType,
      inputs: clone(definition.inputs),
      outputs: clone(definition.outputs),
    },
  };
}
