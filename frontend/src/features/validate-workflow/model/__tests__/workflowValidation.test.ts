import { describe, expect, it } from "vitest";

import type { WorkflowEdge, WorkflowNode } from "@/entities/workflow";

import { validateWorkflow } from "../workflowValidation";

function makeNode(
  id: string,
  overrides: Partial<WorkflowNode["data"]> = {}
): WorkflowNode {
  return {
    id,
    type: "Transform",
    position: { x: 0, y: 0 },
    data: { label: id, inputs: [], outputs: [], ...overrides },
  };
}

function makeEdge(
  id: string,
  sourceNodeId: string,
  sourceHandleId: string,
  targetNodeId: string,
  targetHandleId: string
): WorkflowEdge {
  return { id, sourceNodeId, sourceHandleId, targetNodeId, targetHandleId };
}

const datasetOutput = (id = "out") =>
  ({ id, label: "Output", io: "output" as const, type: "Dataset" as const });
const datasetInput = (id = "in") =>
  ({ id, label: "Input", io: "input" as const, type: "Dataset" as const });
const modelInput = (id = "in") =>
  ({ id, label: "Input", io: "input" as const, type: "Model" as const });

describe("validateWorkflow", () => {
  it("returns no issues for a valid workflow", () => {
    const source = makeNode("n1", { outputs: [datasetOutput()] });
    const target = makeNode("n2", { inputs: [datasetInput()] });
    const edge = makeEdge("e1", "n1", "out", "n2", "in");

    expect(validateWorkflow([source, target], [edge])).toEqual([]);
  });

  it("resolves a node's own output correctly when it shares a handle id with one of its inputs", () => {
    // A Transform-shaped node has an input AND an output both id'd
    // "dataset" — a naive input-then-output lookup would resolve its own
    // output handle to the input one and misreport this as backwards.
    const transform = makeNode("transform", {
      inputs: [datasetInput("dataset")],
      outputs: [datasetOutput("dataset")],
    });
    const model = makeNode("model", { inputs: [datasetInput("dataset")] });
    const edge = makeEdge("e1", "transform", "dataset", "model", "dataset");

    expect(validateWorkflow([transform, model], [edge])).toEqual([]);
  });

  it("flags duplicate node ids", () => {
    const issues = validateWorkflow([makeNode("n1"), makeNode("n1")], []);

    expect(issues).toContainEqual(
      expect.objectContaining({ code: "DUPLICATE_NODE_ID", nodeId: "n1" })
    );
  });

  it("flags duplicate edge ids", () => {
    const n1 = makeNode("n1", { outputs: [datasetOutput()] });
    const n2 = makeNode("n2", { inputs: [datasetInput()] });
    const edge = makeEdge("e1", "n1", "out", "n2", "in");

    const issues = validateWorkflow([n1, n2], [edge, edge]);

    expect(issues).toContainEqual(
      expect.objectContaining({ code: "DUPLICATE_EDGE_ID", edgeId: "e1" })
    );
  });

  it("flags an unknown node reference", () => {
    const n1 = makeNode("n1", { outputs: [datasetOutput()] });
    const edge = makeEdge("e1", "n1", "out", "does-not-exist", "in");

    const issues = validateWorkflow([n1], [edge]);

    expect(issues).toContainEqual(
      expect.objectContaining({ code: "UNKNOWN_NODE_REFERENCE", edgeId: "e1" })
    );
  });

  it("flags an unknown handle reference", () => {
    const n1 = makeNode("n1", { outputs: [datasetOutput()] });
    const n2 = makeNode("n2", { inputs: [datasetInput()] });
    const edge = makeEdge("e1", "n1", "out", "n2", "does-not-exist");

    const issues = validateWorkflow([n1, n2], [edge]);

    expect(issues).toContainEqual(
      expect.objectContaining({ code: "UNKNOWN_HANDLE_REFERENCE", edgeId: "e1" })
    );
  });

  it("flags an invalid direction when the source is not an output", () => {
    const n1 = makeNode("n1", { inputs: [datasetInput("a")] });
    const n2 = makeNode("n2", { inputs: [datasetInput("b")] });
    const edge = makeEdge("e1", "n1", "a", "n2", "b");

    const issues = validateWorkflow([n1, n2], [edge]);

    expect(issues).toContainEqual(
      expect.objectContaining({ code: "INVALID_CONNECTION_DIRECTION", edgeId: "e1" })
    );
  });

  it("flags an invalid direction when the target is not an input", () => {
    const n1 = makeNode("n1", { outputs: [datasetOutput("a")] });
    const n2 = makeNode("n2", { outputs: [datasetOutput("b")] });
    const edge = makeEdge("e1", "n1", "a", "n2", "b");

    const issues = validateWorkflow([n1, n2], [edge]);

    expect(issues).toContainEqual(
      expect.objectContaining({ code: "INVALID_CONNECTION_DIRECTION", edgeId: "e1" })
    );
  });

  it("flags incompatible handle types", () => {
    const n1 = makeNode("n1", { outputs: [datasetOutput()] });
    const n2 = makeNode("n2", { inputs: [modelInput()] });
    const edge = makeEdge("e1", "n1", "out", "n2", "in");

    const issues = validateWorkflow([n1, n2], [edge]);

    expect(issues).toContainEqual(
      expect.objectContaining({ code: "INCOMPATIBLE_HANDLE_TYPES", edgeId: "e1" })
    );
  });

  it("treats an Any-typed input as a wildcard for any source type", () => {
    const n1 = makeNode("n1", { outputs: [datasetOutput()] });
    const n2 = makeNode("n2", {
      inputs: [{ id: "in", label: "Input", io: "input", type: "Any" }],
    });
    const edge = makeEdge("e1", "n1", "out", "n2", "in");

    expect(validateWorkflow([n1, n2], [edge])).toEqual([]);
  });

  it("rejects an Any-typed output into a concrete input", () => {
    const n1 = makeNode("n1", {
      outputs: [{ id: "out", label: "Output", io: "output", type: "Any" }],
    });
    const n2 = makeNode("n2", { inputs: [modelInput()] });
    const edge = makeEdge("e1", "n1", "out", "n2", "in");

    const issues = validateWorkflow([n1, n2], [edge]);

    expect(issues).toContainEqual(
      expect.objectContaining({ code: "INCOMPATIBLE_HANDLE_TYPES", edgeId: "e1" })
    );
  });

  it("flags more than one incoming edge on the same input", () => {
    const n1 = makeNode("n1", {
      outputs: [datasetOutput("a"), datasetOutput("b")],
    });
    const n2 = makeNode("n2", { inputs: [datasetInput()] });
    const edge1 = makeEdge("e1", "n1", "a", "n2", "in");
    const edge2 = makeEdge("e2", "n1", "b", "n2", "in");

    const issues = validateWorkflow([n1, n2], [edge1, edge2]);

    expect(issues).toContainEqual(
      expect.objectContaining({ code: "MULTIPLE_INCOMING_EDGES", edgeId: "e2" })
    );
  });

  it("allows an output to fan out to multiple inputs", () => {
    const n1 = makeNode("n1", { outputs: [datasetOutput()] });
    const n2 = makeNode("n2", { inputs: [datasetInput()] });
    const n3 = makeNode("n3", { inputs: [datasetInput()] });
    const edge1 = makeEdge("e1", "n1", "out", "n2", "in");
    const edge2 = makeEdge("e2", "n1", "out", "n3", "in");

    expect(validateWorkflow([n1, n2, n3], [edge1, edge2])).toEqual([]);
  });

  it("flags a self-reference", () => {
    const n1 = makeNode("n1", {
      outputs: [datasetOutput("a")],
      inputs: [datasetInput("b")],
    });
    const edge = makeEdge("e1", "n1", "a", "n1", "b");

    const issues = validateWorkflow([n1], [edge]);

    expect(issues).toContainEqual(
      expect.objectContaining({ code: "SELF_REFERENCE", edgeId: "e1" })
    );
  });

  it("flags a direct circular reference", () => {
    const n1 = makeNode("n1", {
      outputs: [datasetOutput("a")],
      inputs: [datasetInput("b")],
    });
    const n2 = makeNode("n2", {
      outputs: [datasetOutput("c")],
      inputs: [datasetInput("d")],
    });
    const edge1 = makeEdge("e1", "n1", "a", "n2", "d");
    const edge2 = makeEdge("e2", "n2", "c", "n1", "b");

    const issues = validateWorkflow([n1, n2], [edge1, edge2]);

    expect(issues).toContainEqual(
      expect.objectContaining({ code: "CIRCULAR_REFERENCE" })
    );
  });

  it("flags an indirect circular reference", () => {
    const n1 = makeNode("n1", {
      outputs: [datasetOutput("a")],
      inputs: [datasetInput("b")],
    });
    const n2 = makeNode("n2", {
      outputs: [datasetOutput("c")],
      inputs: [datasetInput("d")],
    });
    const n3 = makeNode("n3", {
      outputs: [datasetOutput("e")],
      inputs: [datasetInput("f")],
    });
    const edge1 = makeEdge("e1", "n1", "a", "n2", "d");
    const edge2 = makeEdge("e2", "n2", "c", "n3", "f");
    const edge3 = makeEdge("e3", "n3", "e", "n1", "b");

    const issues = validateWorkflow([n1, n2, n3], [edge1, edge2, edge3]);

    expect(issues).toContainEqual(
      expect.objectContaining({ code: "CIRCULAR_REFERENCE" })
    );
  });

  it("does not treat a shortcut edge (diamond shape) as a cycle", () => {
    const n1 = makeNode("n1", {
      outputs: [datasetOutput("a1"), datasetOutput("a2")],
    });
    const n2 = makeNode("n2", {
      inputs: [datasetInput("b_in")],
      outputs: [datasetOutput("b_out")],
    });
    const n3 = makeNode("n3", {
      inputs: [datasetInput("c1"), datasetInput("c2")],
    });
    const edge1 = makeEdge("e1", "n1", "a1", "n2", "b_in");
    const edge2 = makeEdge("e2", "n2", "b_out", "n3", "c1");
    const edge3 = makeEdge("e3", "n1", "a2", "n3", "c2");

    expect(validateWorkflow([n1, n2, n3], [edge1, edge2, edge3])).toEqual([]);
  });

  it("references node and handle labels in the message", () => {
    const n1 = makeNode("n1", {
      outputs: [datasetOutput()],
      label: "Load CSV",
    });
    const n2 = makeNode("n2", { inputs: [modelInput()], label: "Train model" });
    const edge = makeEdge("e1", "n1", "out", "n2", "in");

    const issues = validateWorkflow([n1, n2], [edge]);
    const issue = issues.find((i) => i.code === "INCOMPATIBLE_HANDLE_TYPES");

    expect(issue?.message).toContain("Load CSV");
    expect(issue?.message).toContain("Train model");
  });
});
