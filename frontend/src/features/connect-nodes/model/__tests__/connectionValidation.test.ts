import { describe, expect, it } from "vitest";

import {
  isTypeCompatible,
  validateConnection,
  type ConnectionValidationEdge,
  type ConnectionValidationNode,
} from "../connectionValidation";

const dataSource: ConnectionValidationNode = {
  id: "datasource-1",
  inputs: [],
  outputs: [{ id: "dataset", label: "Dataset", type: "Dataset" }],
};

const transform: ConnectionValidationNode = {
  id: "transform-1",
  inputs: [
    { id: "dataset", label: "Dataset", type: "Dataset", required: true },
  ],
  outputs: [{ id: "dataset", label: "Dataset", type: "Dataset" }],
};

const model: ConnectionValidationNode = {
  id: "model-1",
  inputs: [
    { id: "dataset", label: "Dataset", type: "Dataset", required: true },
  ],
  outputs: [{ id: "model", label: "Model", type: "Model" }],
};

/** A node with an `Any`-typed input, for exercising the wildcard rule (no such node ships in NODE_DEFINITIONS yet). */
const anyConsumer: ConnectionValidationNode = {
  id: "any-consumer-1",
  inputs: [{ id: "in", label: "In", type: "Any" }],
  outputs: [],
};

describe("isTypeCompatible", () => {
  it("matches identical types", () => {
    expect(isTypeCompatible("Dataset", "Dataset")).toBe(true);
  });

  it("rejects mismatched concrete types", () => {
    expect(isTypeCompatible("Dataset", "Model")).toBe(false);
  });

  it("treats Any as compatible with any concrete type, either side", () => {
    expect(isTypeCompatible("Dataset", "Any")).toBe(true);
    expect(isTypeCompatible("Any", "Model")).toBe(true);
  });
});

describe("validateConnection", () => {
  it("accepts a type-compatible connection", () => {
    const result = validateConnection(
      {
        source: "datasource-1",
        sourceHandle: "dataset",
        target: "transform-1",
        targetHandle: "dataset",
      },
      [dataSource, transform],
      []
    );
    expect(result).toEqual({ valid: true });
  });

  it("accepts a connection into an Any-typed handle", () => {
    const result = validateConnection(
      {
        source: "datasource-1",
        sourceHandle: "dataset",
        target: "any-consumer-1",
        targetHandle: "in",
      },
      [dataSource, anyConsumer],
      []
    );
    expect(result.valid).toBe(true);
  });

  it("rejects an incompatible type pairing with a clear message", () => {
    const result = validateConnection(
      {
        source: "model-1",
        sourceHandle: "model",
        target: "transform-1",
        targetHandle: "dataset",
      },
      [model, transform],
      []
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("incompatible-type");
    expect(result.message).toMatch(/model/i);
  });

  it("rejects a node connecting to itself", () => {
    const result = validateConnection(
      {
        source: "transform-1",
        sourceHandle: "dataset",
        target: "transform-1",
        targetHandle: "dataset",
      },
      [transform],
      []
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("self-reference");
  });

  it("gives self-reference its own message distinct from the circular-reference one", () => {
    const selfRef = validateConnection(
      {
        source: "transform-1",
        sourceHandle: "dataset",
        target: "transform-1",
        targetHandle: "dataset",
      },
      [transform],
      []
    );

    const a: ConnectionValidationNode = {
      id: "a",
      inputs: [{ id: "in", label: "In", type: "Dataset" }],
      outputs: [{ id: "out", label: "Out", type: "Dataset" }],
    };
    const b: ConnectionValidationNode = {
      id: "b",
      inputs: [{ id: "in", label: "In", type: "Dataset" }],
      outputs: [{ id: "out", label: "Out", type: "Dataset" }],
    };
    const existingEdges: ConnectionValidationEdge[] = [
      { source: "a", target: "b" },
    ];
    const cycle = validateConnection(
      { source: "b", sourceHandle: "out", target: "a", targetHandle: "in" },
      [a, b],
      existingEdges
    );

    expect(selfRef.message).not.toEqual(cycle.message);
  });

  it("rejects a direct two-node cycle (B -> A when A -> B already exists)", () => {
    const a: ConnectionValidationNode = {
      id: "a",
      inputs: [{ id: "in", label: "In", type: "Dataset" }],
      outputs: [{ id: "out", label: "Out", type: "Dataset" }],
    };
    const b: ConnectionValidationNode = {
      id: "b",
      inputs: [{ id: "in", label: "In", type: "Dataset" }],
      outputs: [{ id: "out", label: "Out", type: "Dataset" }],
    };
    const existingEdges: ConnectionValidationEdge[] = [
      { source: "a", target: "b" },
    ];

    const result = validateConnection(
      { source: "b", sourceHandle: "out", target: "a", targetHandle: "in" },
      [a, b],
      existingEdges
    );

    expect(result.valid).toBe(false);
    expect(result.reason).toBe("circular-reference");
  });

  it("rejects a longer indirect cycle (A -> B -> C, then C -> A)", () => {
    const a: ConnectionValidationNode = {
      id: "a",
      inputs: [{ id: "in", label: "In", type: "Dataset" }],
      outputs: [{ id: "out", label: "Out", type: "Dataset" }],
    };
    const b: ConnectionValidationNode = {
      id: "b",
      inputs: [{ id: "in", label: "In", type: "Dataset" }],
      outputs: [{ id: "out", label: "Out", type: "Dataset" }],
    };
    const c: ConnectionValidationNode = {
      id: "c",
      inputs: [{ id: "in", label: "In", type: "Dataset" }],
      outputs: [{ id: "out", label: "Out", type: "Dataset" }],
    };
    const existingEdges: ConnectionValidationEdge[] = [
      { source: "a", target: "b" },
      { source: "b", target: "c" },
    ];

    const result = validateConnection(
      { source: "c", sourceHandle: "out", target: "a", targetHandle: "in" },
      [a, b, c],
      existingEdges
    );

    expect(result.valid).toBe(false);
    expect(result.reason).toBe("circular-reference");
  });

  it("accepts a connection that fans an output out to a second, independent branch (not a cycle)", () => {
    const a: ConnectionValidationNode = {
      id: "a",
      inputs: [],
      outputs: [{ id: "out", label: "Out", type: "Dataset" }],
    };
    const b: ConnectionValidationNode = {
      id: "b",
      inputs: [{ id: "in", label: "In", type: "Dataset" }],
      outputs: [],
    };
    const c: ConnectionValidationNode = {
      id: "c",
      inputs: [{ id: "in", label: "In", type: "Dataset" }],
      outputs: [],
    };
    const existingEdges: ConnectionValidationEdge[] = [
      { source: "a", target: "b" },
    ];

    const result = validateConnection(
      { source: "a", sourceHandle: "out", target: "c", targetHandle: "in" },
      [a, b, c],
      existingEdges
    );

    expect(result).toEqual({ valid: true });
  });
});
