import type { FlowEdge, FlowNode } from "./flowTypes";
import type { Workflow, WorkflowEdge, WorkflowNode } from "./types";

/**
 * Conversions between ReactFlow's node/edge shapes (`Flow*`) and the
 * persisted domain shape (`Workflow`) — the two are structurally different
 * (see `flowTypes.ts`), so every save/load crosses this boundary.
 */

function flowNodeToWorkflowNode(node: FlowNode): WorkflowNode {
  return {
    id: node.id,
    type: node.data.nodeType,
    position: node.position,
    data: {
      label: node.data.label,
      inputs: node.data.inputs,
      outputs: node.data.outputs,
    },
  };
}

function flowEdgeToWorkflowEdge(edge: FlowEdge): WorkflowEdge {
  return {
    id: edge.id,
    sourceNodeId: edge.source,
    sourceHandleId: edge.sourceHandle ?? "",
    targetNodeId: edge.target,
    targetHandleId: edge.targetHandle ?? "",
  };
}

export function flowToWorkflow(
  nodes: FlowNode[],
  edges: FlowEdge[],
  base: Pick<Workflow, "id" | "lid" | "name">
): Workflow {
  return {
    ...base,
    nodes: nodes.map(flowNodeToWorkflowNode),
    edges: edges.map(flowEdgeToWorkflowEdge),
  };
}

function workflowNodeToFlowNode(node: WorkflowNode): FlowNode {
  return {
    id: node.id,
    type: "workflowNode",
    position: node.position,
    data: {
      label: node.data.label,
      nodeType: node.type,
      inputs: node.data.inputs,
      outputs: node.data.outputs,
    },
  };
}

function workflowEdgeToFlowEdge(edge: WorkflowEdge): FlowEdge {
  return {
    id: edge.id,
    source: edge.sourceNodeId,
    sourceHandle: edge.sourceHandleId,
    target: edge.targetNodeId,
    targetHandle: edge.targetHandleId,
  };
}

export function workflowToFlow(workflow: Workflow): {
  nodes: FlowNode[];
  edges: FlowEdge[];
} {
  return {
    nodes: workflow.nodes.map(workflowNodeToFlowNode),
    edges: workflow.edges.map(workflowEdgeToFlowEdge),
  };
}
