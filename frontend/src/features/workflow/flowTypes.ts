import type {
  Edge as ReactFlowEdge,
  Node as ReactFlowNode,
} from "@xyflow/react";

import type { HandleDefinition, NodeType } from "@/types/workflow";

/**
 * The `data` payload carried by each ReactFlow node in the editor. It's kept
 * close to the domain node's `data` so mapping to/from the persisted
 * `WorkflowNode` is straightforward — but note the graph the API stores is NOT
 * a ReactFlow graph. Converting between these `Flow*` types and the domain
 * `Workflow` (see `@/types/workflow`) is yours to design.
 */
export type WorkflowNodeData = {
  label: string;
  nodeType: NodeType;
  inputs: HandleDefinition[];
  outputs: HandleDefinition[];
};

export type FlowNode = ReactFlowNode<WorkflowNodeData, "workflowNode">;
export type FlowEdge = ReactFlowEdge;
