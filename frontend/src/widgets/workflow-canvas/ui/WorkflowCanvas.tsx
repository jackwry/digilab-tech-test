import { useMemo } from "react";
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  type NodeProps,
  type NodeTypes,
  type OnConnectEnd,
  type OnEdgesChange,
  type OnNodesChange,
} from "@xyflow/react";

import {
  WorkflowNodeCard,
  type FlowEdge,
  type FlowNode,
} from "@/entities/workflow";
import {
  ConnectionWarning,
  type UseConnectNodesResult,
} from "@/features/connect-nodes";

interface WorkflowCanvasProps {
  nodes: FlowNode[];
  edges: FlowEdge[];
  onNodesChange: OnNodesChange<FlowNode>;
  onEdgesChange: OnEdgesChange<FlowEdge>;
  onConnectEnd: OnConnectEnd;
  onLabelChange: (id: string, label: string) => void;
  connectionWarning: UseConnectNodesResult["warning"];
}

/** The ReactFlow canvas. Controlled — node/edge state lives in the parent (see `useWorkflowCanvasState`). */
export function WorkflowCanvas({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnectEnd,
  onLabelChange,
  connectionWarning,
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
    <>
      <ReactFlow<FlowNode, FlowEdge>
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnectEnd={onConnectEnd}
        nodeTypes={nodeTypes}
        fitView
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
      <ConnectionWarning warning={connectionWarning} />
    </>
  );
}
