import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { FlowEdge, FlowNode } from "@/entities/workflow";

import { useDeleteNode } from "../useDeleteNode";

function buildNode(overrides: Partial<FlowNode> = {}): FlowNode {
  return {
    id: "node-1",
    type: "workflowNode",
    position: { x: 0, y: 0 },
    data: {
      label: "Node",
      nodeType: "DataSource",
      inputs: [],
      outputs: [],
    },
    ...overrides,
  } as FlowNode;
}

function buildEdge(overrides: Partial<FlowEdge> = {}): FlowEdge {
  return {
    id: "edge-1",
    source: "node-1",
    target: "node-2",
    ...overrides,
  } as FlowEdge;
}

describe("useDeleteNode", () => {
  it("removes only the node with the matching id", () => {
    const setNodes = vi.fn();
    const setEdges = vi.fn();
    const { result } = renderHook(() => useDeleteNode(setNodes, setEdges));

    result.current("node-1");

    expect(setNodes).toHaveBeenCalledOnce();
    const updater = setNodes.mock.calls[0][0] as (
      nodes: FlowNode[]
    ) => FlowNode[];
    const target = buildNode({ id: "node-1" });
    const other = buildNode({ id: "node-2" });

    expect(updater([target, other])).toEqual([other]);
  });

  it("removes any edge whose source or target is the deleted node, leaving unrelated edges intact", () => {
    const setNodes = vi.fn();
    const setEdges = vi.fn();
    const { result } = renderHook(() => useDeleteNode(setNodes, setEdges));

    result.current("node-1");

    expect(setEdges).toHaveBeenCalledOnce();
    const updater = setEdges.mock.calls[0][0] as (
      edges: FlowEdge[]
    ) => FlowEdge[];
    const asSource = buildEdge({
      id: "edge-1",
      source: "node-1",
      target: "node-2",
    });
    const asTarget = buildEdge({
      id: "edge-2",
      source: "node-3",
      target: "node-1",
    });
    const unrelated = buildEdge({
      id: "edge-3",
      source: "node-2",
      target: "node-3",
    });

    expect(updater([asSource, asTarget, unrelated])).toEqual([unrelated]);
  });

  it("leaves nodes and edges unchanged if no node matches the given id", () => {
    const setNodes = vi.fn();
    const setEdges = vi.fn();
    const { result } = renderHook(() => useDeleteNode(setNodes, setEdges));

    result.current("missing-id");

    const nodesUpdater = setNodes.mock.calls[0][0] as (
      nodes: FlowNode[]
    ) => FlowNode[];
    const edgesUpdater = setEdges.mock.calls[0][0] as (
      edges: FlowEdge[]
    ) => FlowEdge[];
    const nodes = [buildNode()];
    const edges = [buildEdge()];

    expect(nodesUpdater(nodes)).toEqual(nodes);
    expect(edgesUpdater(edges)).toEqual(edges);
  });
});
