import type { FinalConnectionState } from "@xyflow/react";
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { FlowEdge, FlowNode } from "@/entities/workflow";

import { useConnectNodes } from "../useConnectNodes";

function makeNode(
  id: string,
  nodeType: FlowNode["data"]["nodeType"],
  overrides?: Partial<FlowNode["data"]>
): FlowNode {
  return {
    id,
    type: "workflowNode",
    position: { x: 0, y: 0 },
    data: {
      label: id,
      nodeType,
      inputs:
        nodeType === "DataSource"
          ? []
          : [
              {
                id: "dataset",
                label: "Dataset",
                io: "input",
                type: "Dataset",
                required: true,
              },
            ],
      outputs:
        nodeType === "Model"
          ? [{ id: "model", label: "Model", io: "output", type: "Model" }]
          : [{ id: "dataset", label: "Dataset", io: "output", type: "Dataset" }],
      ...overrides,
    },
  };
}

/** Builds a minimal `FinalConnectionState` — only the fields `useConnectNodes` reads. */
function connectionStateFor(
  fromId: string,
  fromHandleId: string,
  toId: string | null,
  toHandleId: string | null
): FinalConnectionState {
  return {
    isValid: toId !== null,
    fromNode: { id: fromId } as never,
    fromHandle: { id: fromHandleId } as never,
    fromPosition: "right" as never,
    from: { x: 0, y: 0 },
    toNode: toId ? ({ id: toId } as never) : null,
    toHandle: toHandleId ? ({ id: toHandleId } as never) : null,
    toPosition: null,
    to: null as never,
    pointer: { x: 0, y: 0 },
  } as unknown as FinalConnectionState;
}

describe("useConnectNodes", () => {
  it("commits a valid connection via setEdges", () => {
    const nodes = [
      makeNode("datasource-1", "DataSource"),
      makeNode("transform-1", "Transform"),
    ];
    const edges: FlowEdge[] = [];
    const setEdges = vi.fn();

    const { result } = renderHook(() =>
      useConnectNodes(nodes, edges, setEdges)
    );

    const event = new MouseEvent("mouseup", { clientX: 100, clientY: 200 });
    act(() => {
      result.current.onConnectEnd(
        event,
        connectionStateFor("datasource-1", "dataset", "transform-1", "dataset")
      );
    });

    expect(setEdges).toHaveBeenCalledTimes(1);
    expect(result.current.warning).toBeNull();
  });

  it("shows a warning instead of committing an edge when the connection is invalid", () => {
    const nodes = [
      makeNode("model-1", "Model"),
      makeNode("transform-1", "Transform"),
    ];
    const edges: FlowEdge[] = [];
    const setEdges = vi.fn();

    const { result } = renderHook(() =>
      useConnectNodes(nodes, edges, setEdges)
    );

    const event = new MouseEvent("mouseup", { clientX: 150, clientY: 260 });
    act(() => {
      // Model.Model -> Transform.Dataset: incompatible types.
      result.current.onConnectEnd(
        event,
        connectionStateFor("model-1", "model", "transform-1", "dataset")
      );
    });

    expect(setEdges).not.toHaveBeenCalled();
    expect(result.current.warning).not.toBeNull();
    expect(result.current.warning?.x).toBe(150);
    expect(result.current.warning?.y).toBe(260);
  });

  it("does nothing when the drag is released over empty canvas (no target handle)", () => {
    const nodes = [makeNode("datasource-1", "DataSource")];
    const edges: FlowEdge[] = [];
    const setEdges = vi.fn();

    const { result } = renderHook(() =>
      useConnectNodes(nodes, edges, setEdges)
    );

    const event = new MouseEvent("mouseup", { clientX: 10, clientY: 10 });
    act(() => {
      result.current.onConnectEnd(
        event,
        connectionStateFor("datasource-1", "dataset", null, null)
      );
    });

    expect(setEdges).not.toHaveBeenCalled();
    expect(result.current.warning).toBeNull();
  });
});
