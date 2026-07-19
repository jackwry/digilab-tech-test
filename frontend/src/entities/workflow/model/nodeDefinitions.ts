import type { HandleDefinition, NodeType } from "./types";

/**
 * The canonical input/output handles for each node type. A starting point —
 * extend or restructure as your design requires (for example if adding a new
 * node type).
 */
export const NODE_DEFINITIONS: Record<
  NodeType,
  { inputs: HandleDefinition[]; outputs: HandleDefinition[] }
> = {
  DataSource: {
    inputs: [],
    outputs: [{ id: "dataset", label: "Dataset", type: "Dataset" }],
  },
  Transform: {
    inputs: [
      { id: "dataset", label: "Dataset", type: "Dataset", required: true },
    ],
    outputs: [{ id: "dataset", label: "Dataset", type: "Dataset" }],
  },
  Model: {
    inputs: [
      { id: "dataset", label: "Dataset", type: "Dataset", required: true },
    ],
    outputs: [{ id: "model", label: "Model", type: "Model" }],
  },
};
