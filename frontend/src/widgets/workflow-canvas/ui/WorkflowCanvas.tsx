import { useMemo } from "react";
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  type NodeProps,
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

interface WorkflowCanvasProps {
  nodes: FlowNode[];
  edges: FlowEdge[];
  onNodesChange: OnNodesChange<FlowNode>;
  onEdgesChange: OnEdgesChange<FlowEdge>;
  onConnect: OnConnect;
  onLabelChange: (id: string, label: string) => void;
}

/** The ReactFlow canvas. Controlled — node/edge state lives in the parent (see `useWorkflowCanvasState`). */
export function WorkflowCanvas({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onLabelChange,
}: WorkflowCanvasProps) {
  const nodeTypes = useMemo<NodeTypes>(
    () => ({
      workflowNode: (props: NodeProps<FlowNode>) => (
        <WorkflowNodeCard {...props} onLabelChange={onLabelChange} />
      ),
    }),
    [onLabelChange]
  );

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
