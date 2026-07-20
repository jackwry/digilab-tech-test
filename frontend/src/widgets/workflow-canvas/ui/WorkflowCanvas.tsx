import { useMemo } from "react";
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  type NodeProps,
  type NodeTypes,
} from "@xyflow/react";

import {
  WorkflowNodeCard,
  useWorkflowStore,
  type FlowEdge,
  type FlowNode,
} from "@/entities/workflow";
import { useDeleteNode } from "@/features/delete-node";
import { useUpdateNodeLabel } from "@/features/edit-node-label";
import { ConnectionWarning, useConnectNodes } from "@/features/connect-nodes";

/**
 * The ReactFlow canvas. Reads/writes canvas state directly from
 * `useWorkflowStore` (moved out of a page-drilled hook in JAC-19). Wires up
 * `onLabelChange`/`onDelete` itself since both are only ever consumed by the
 * node card this canvas renders — threading them through the page as props
 * would just be passthrough.
 */
export function WorkflowCanvas() {
  const nodes = useWorkflowStore((state) => state.nodes);
  const edges = useWorkflowStore((state) => state.edges);
  const setNodes = useWorkflowStore((state) => state.setNodes);
  const setEdges = useWorkflowStore((state) => state.setEdges);
  const onNodesChange = useWorkflowStore((state) => state.onNodesChange);
  const onEdgesChange = useWorkflowStore((state) => state.onEdgesChange);

  const { onConnectEnd, warning: connectionWarning } = useConnectNodes(
    nodes,
    edges,
    setEdges
  );
  const onLabelChange = useUpdateNodeLabel(setNodes);
  const onDelete = useDeleteNode(setNodes, setEdges);

  const nodeTypes = useMemo<NodeTypes>(
    () => ({
      workflowNode: (props: NodeProps<FlowNode>) => (
        <WorkflowNodeCard
          {...props}
          onLabelChange={onLabelChange}
          onDelete={onDelete}
        />
      ),
    }),
    [onLabelChange, onDelete]
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
