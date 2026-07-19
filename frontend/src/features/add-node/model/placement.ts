import type { FlowNode } from "@/entities/workflow";

const COLUMNS = 4;
const COLUMN_WIDTH = 300;
const ROW_HEIGHT = 160;
const ORIGIN = { x: 80, y: 360 };

/**
 * Where to drop a newly-added node so it doesn't land exactly on top of an
 * existing one. Staggers nodes into a simple grid below the seed graph;
 * repositioning afterwards is left to the user (drag is native to
 * ReactFlow).
 */
export function nextNodePosition(
  existingNodes: FlowNode[]
): FlowNode["position"] {
  const index = existingNodes.length;
  return {
    x: ORIGIN.x + (index % COLUMNS) * COLUMN_WIDTH,
    y: ORIGIN.y + Math.floor(index / COLUMNS) * ROW_HEIGHT,
  };
}
