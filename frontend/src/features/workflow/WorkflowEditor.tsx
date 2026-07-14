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

import type { FlowEdge, FlowNode } from "./flowTypes";
import { initialEdges, initialNodes } from "./initialWorkflow";
import { WorkflowNode } from "./WorkflowNode";

const nodeTypes = { workflowNode: WorkflowNode } satisfies NodeTypes;

export function WorkflowEditor() {
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
      {/* TODO (candidate): a real toolbar — add-node buttons, save, validate,
          and a clear status indicator (unsaved / saving / saved / error). */}
      <div className="absolute top-3 left-3 z-10 rounded-lg bg-white/90 p-3 shadow">
        <h1 className="text-sm font-semibold text-slate-800">
          Workflow editor
        </h1>
        <p className="mt-1 text-xs text-slate-500">
          Starter canvas — build from here.
        </p>
      </div>

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
