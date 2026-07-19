import { useCallback } from "react";
import {
  addEdge,
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  useEdgesState,
  useNodesState,
  type Connection,
  type NodeTypes,
} from "@xyflow/react";

import {
  WorkflowNodeCard,
  type FlowEdge,
  type FlowNode,
} from "@/entities/workflow";

import { initialEdges, initialNodes } from "../model/initialWorkflow";

const nodeTypes = { workflowNode: WorkflowNodeCard } satisfies NodeTypes;

export function WorkflowCanvas() {
  const [nodes, , onNodesChange] = useNodesState<FlowNode>(initialNodes);
  const [edges, setEdges, onEdgesChange] =
    useEdgesState<FlowEdge>(initialEdges);

  // TODO (candidate): enforce the connection rules from brief §C2 here —
  // Right now every connection is accepted.
  const onConnect = useCallback(
    (connection: Connection) => setEdges((eds) => addEdge(connection, eds)),
    [setEdges]
  );

  return (
    <div className="relative h-full w-full">
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
    </div>
  );
}
