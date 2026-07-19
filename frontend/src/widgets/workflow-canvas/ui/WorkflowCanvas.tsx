import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  type NodeTypes,
  type OnConnect,
  type OnEdgesChange,
  type OnNodesChange,
} from "@xyflow/react";

import {
  WorkflowNodeCard,
  type FlowEdge,
  type FlowNode,
} from "@/entities/workflow";

const nodeTypes = { workflowNode: WorkflowNodeCard } satisfies NodeTypes;

interface WorkflowCanvasProps {
  nodes: FlowNode[];
  edges: FlowEdge[];
  onNodesChange: OnNodesChange<FlowNode>;
  onEdgesChange: OnEdgesChange<FlowEdge>;
  onConnect: OnConnect;
}

/** The ReactFlow canvas. Controlled — node/edge state lives in the parent (see `useWorkflowCanvasState`). */
export function WorkflowCanvas({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
}: WorkflowCanvasProps) {
  return (
    <ReactFlow<FlowNode, FlowEdge>
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      nodeTypes={nodeTypes}
      fitView
    >
      <Background />
      <Controls />
      <MiniMap />
    </ReactFlow>
  );
}
