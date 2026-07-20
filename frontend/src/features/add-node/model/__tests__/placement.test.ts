import { describe, expect, it } from "vitest";

import type { FlowNode } from "@/entities/workflow";

import { nextNodePosition } from "../placement";

const node = (id: string): FlowNode => ({
  id,
  type: "workflowNode",
  position: { x: 0, y: 0 },
  data: { label: id, nodeType: "DataSource", inputs: [], outputs: [] },
});

describe("nextNodePosition", () => {
  it("returns a position for an empty canvas", () => {
    expect(nextNodePosition([])).toEqual({
      x: expect.any(Number),
      y: expect.any(Number),
    });
  });

  it("never returns the same position twice in a row as nodes are added", () => {
    const first = nextNodePosition([]);
    const second = nextNodePosition([node("a")]);
    expect(second).not.toEqual(first);
  });

  it("wraps into a new row after filling a row of columns", () => {
    const existing = Array.from({ length: 4 }, (_, i) => node(`n${i}`));
    const wrapped = nextNodePosition(existing);
    const first = nextNodePosition([]);
    expect(wrapped.y).toBeGreaterThan(first.y);
  });
});
