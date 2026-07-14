import type { FlowEdge, FlowNode } from "./flowTypes";
import { createFlowNode } from "./nodeFactory";

/**
 * An example seed graph (DataSource → Transform → Model) so the canvas renders something
 * on first load.
 */
export const initialNodes: FlowNode[] = [
  createFlowNode({
    id: "datasource-1",
    nodeType: "DataSource",
    label: "Load Dataset",
    position: { x: 80, y: 140 },
  }),
  createFlowNode({
    id: "transform-1",
    nodeType: "Transform",
    label: "Transform Dataset",
    position: { x: 380, y: 140 },
  }),
  createFlowNode({
    id: "model-1",
    nodeType: "Model",
    label: "Train Model",
    position: { x: 680, y: 140 },
  }),
];

export const initialEdges: FlowEdge[] = [
  {
    id: "edge-1",
    source: "datasource-1",
    sourceHandle: "dataset",
    target: "transform-1",
    targetHandle: "dataset",
  },
  {
    id: "edge-2",
    source: "transform-1",
    sourceHandle: "dataset",
    target: "model-1",
    targetHandle: "dataset",
  },
];
