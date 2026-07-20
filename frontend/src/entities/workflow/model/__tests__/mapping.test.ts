import { describe, expect, it } from "vitest";

import { flowToWorkflow, workflowToFlow } from "../mapping";
import type { FlowEdge, FlowNode } from "../flowTypes";
import type { Workflow } from "../types";

function buildFlowNode(overrides: Partial<FlowNode> = {}): FlowNode {
  return {
    id: "node-1",
    type: "workflowNode",
    position: { x: 10, y: 20 },
    data: {
      label: "Load",
      nodeType: "DataSource",
      inputs: [],
      outputs: [
        { id: "dataset", label: "Dataset", io: "output", type: "Dataset" },
      ],
    },
    ...overrides,
  } as FlowNode;
}

function buildFlowEdge(overrides: Partial<FlowEdge> = {}): FlowEdge {
  return {
    id: "edge-1",
    source: "node-1",
    sourceHandle: "dataset",
    target: "node-2",
    targetHandle: "dataset",
    ...overrides,
  } as FlowEdge;
}

describe("flowToWorkflow", () => {
  it("maps ReactFlow nodes/edges into the domain shape, carrying the base fields through", () => {
    const workflow = flowToWorkflow([buildFlowNode()], [buildFlowEdge()], {
      id: "wf-1",
      lid: "local-1",
      name: "demo",
    });

    expect(workflow).toEqual({
      id: "wf-1",
      lid: "local-1",
      name: "demo",
      nodes: [
        {
          id: "node-1",
          type: "DataSource",
          position: { x: 10, y: 20 },
          data: {
            label: "Load",
            inputs: [],
            outputs: [
              {
                id: "dataset",
                label: "Dataset",
                io: "output",
                type: "Dataset",
              },
            ],
          },
        },
      ],
      edges: [
        {
          id: "edge-1",
          sourceNodeId: "node-1",
          sourceHandleId: "dataset",
          targetNodeId: "node-2",
          targetHandleId: "dataset",
        },
      ],
    });
  });

  it("defaults a missing edge handle to an empty string", () => {
    const workflow = flowToWorkflow(
      [],
      [buildFlowEdge({ sourceHandle: null, targetHandle: null })],
      { name: "demo" }
    );

    expect(workflow.edges[0]).toMatchObject({
      sourceHandleId: "",
      targetHandleId: "",
    });
  });
});

describe("workflowToFlow", () => {
  it("maps the domain shape back into ReactFlow nodes/edges", () => {
    const workflow: Workflow = {
      id: "wf-1",
      name: "demo",
      nodes: [
        {
          id: "node-1",
          type: "Transform",
          position: { x: 5, y: 6 },
          data: { label: "Transform", inputs: [], outputs: [] },
        },
      ],
      edges: [
        {
          id: "edge-1",
          sourceNodeId: "node-1",
          sourceHandleId: "dataset",
          targetNodeId: "node-2",
          targetHandleId: "dataset",
        },
      ],
    };

    const { nodes, edges } = workflowToFlow(workflow);

    expect(nodes).toEqual([
      {
        id: "node-1",
        type: "workflowNode",
        position: { x: 5, y: 6 },
        data: {
          label: "Transform",
          nodeType: "Transform",
          inputs: [],
          outputs: [],
        },
      },
    ]);
    expect(edges).toEqual([
      {
        id: "edge-1",
        source: "node-1",
        sourceHandle: "dataset",
        target: "node-2",
        targetHandle: "dataset",
      },
    ]);
  });

  it("round-trips through flowToWorkflow back to an equivalent workflow", () => {
    const nodes = [buildFlowNode()];
    const edges = [buildFlowEdge()];

    const workflow = flowToWorkflow(nodes, edges, { name: "demo" });
    const flow = workflowToFlow(workflow);

    expect(flow.nodes).toEqual(nodes);
    expect(flow.edges).toEqual(edges);
  });
});
