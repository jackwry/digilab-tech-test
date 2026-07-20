/**
 * Public API of the `workflow` entity slice. Other layers should import from
 * here (e.g. `@/entities/workflow`) rather than reaching into `model/`,
 * `api/`, or `ui/` directly.
 */
export type {
  DataType,
  NodeType,
  HandleDefinition,
  WorkflowNode,
  WorkflowEdge,
  Workflow,
  ValidationIssue,
  ValidationResult,
} from "./model/types";
export type { FlowNode, FlowEdge, WorkflowNodeData } from "./model/flowTypes";
export { NODE_DEFINITIONS } from "./model/nodeDefinitions";
export { createFlowNode } from "./model/nodeFactory";
export { useWorkflowStore } from "./model/workflowStore";
export { flowToWorkflow, workflowToFlow } from "./model/mapping";
export { initialNodes, initialEdges } from "./model/initialWorkflow";
export { generateDefaultWorkflowName } from "./model/workflowName";

export {
  createWorkflow,
  getWorkflow,
  listWorkflows,
  updateWorkflow,
} from "./api/workflowApi";

export { WorkflowNodeCard } from "./ui/WorkflowNodeCard";
