import type { NodeType } from "@/entities/workflow";

/** Human-readable label shown in the "Add Node" menu for each node type. */
export const NODE_TYPE_LABELS: Record<NodeType, string> = {
  DataSource: "Data Source",
  Transform: "Transform",
  Model: "Model",
};

/** Short blurb shown next to each node type in the "Add Node" menu. */
export const NODE_TYPE_DESCRIPTIONS: Record<NodeType, string> = {
  DataSource: "Add a dataset source",
  Transform: "Transform a dataset",
  Model: "Train a model from a dataset",
};
