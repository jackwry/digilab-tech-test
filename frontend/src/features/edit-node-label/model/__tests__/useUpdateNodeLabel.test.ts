import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { FlowNode } from "@/entities/workflow";

import { useUpdateNodeLabel } from "../useUpdateNodeLabel";

function buildNode(overrides: Partial<FlowNode> = {}): FlowNode {
  return {
    id: "node-1",
    type: "workflowNode",
    position: { x: 0, y: 0 },
    data: {
      label: "Original",
      nodeType: "DataSource",
      inputs: [],
      outputs: [],
    },
    ...overrides,
  } as FlowNode;
}

describe("useUpdateNodeLabel", () => {
  it("updates only the label of the matching node, leaving other data untouched", () => {
    const setNodes = vi.fn();
    const { result } = renderHook(() => useUpdateNodeLabel(setNodes));

    result.current("node-1", "Renamed");

    expect(setNodes).toHaveBeenCalledOnce();
    const updater = setNodes.mock.calls[0][0] as (
      nodes: FlowNode[]
    ) => FlowNode[];
    const target = buildNode();
    const other = buildNode({
      id: "node-2",
      data: { ...buildNode().data, label: "Other" },
    });

    const result_ = updater([target, other]);

    expect(result_[0].data.label).toBe("Renamed");
    expect(result_[0].data.nodeType).toBe(target.data.nodeType);
    expect(result_[1]).toEqual(other);
  });

  it("leaves the node list unchanged if no node matches the given id", () => {
    const setNodes = vi.fn();
    const { result } = renderHook(() => useUpdateNodeLabel(setNodes));

    result.current("missing-id", "Renamed");

    const updater = setNodes.mock.calls[0][0] as (
      nodes: FlowNode[]
    ) => FlowNode[];
    const nodes = [buildNode()];

    expect(updater(nodes)).toEqual(nodes);
  });
});
