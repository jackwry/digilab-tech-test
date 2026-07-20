import { describe, expect, it } from "vitest";

import {
  inputHasExistingOutput,
  isTypeCompatible,
  validateConnection,
  type ConnectionValidationEdge,
  type ConnectionValidationNode,
} from "../connectionValidation";

const dataSource: ConnectionValidationNode = {
  id: "datasource-1",
  label: "DataSource",
  inputs: [],
  outputs: [{ id: "dataset", label: "Dataset", io: "output", type: "Dataset" }],
};

const transform: ConnectionValidationNode = {
  id: "transform-1",
  label: "Transform",
  inputs: [
    {
      id: "dataset",
      label: "Dataset",
      io: "input",
      type: "Dataset",
      required: true,
    },
  ],
  outputs: [{ id: "dataset", label: "Dataset", io: "output", type: "Dataset" }],
};

const model: ConnectionValidationNode = {
  id: "model-1",
  label: "Model",
  inputs: [
    {
      id: "dataset",
      label: "Dataset",
      io: "input",
      type: "Dataset",
      required: true,
    },
  ],
  outputs: [{ id: "model", label: "Model", io: "output", type: "Model" }],
};

/** A node with an `Any`-typed input, for exercising the wildcard rule (no such node ships in NODE_DEFINITIONS yet). */
const anyConsumer: ConnectionValidationNode = {
  id: "any-consumer-1",
  label: "Any Consumer",
  inputs: [{ id: "in", label: "In", io: "input", type: "Any" }],
  outputs: [],
};

/** A node with an `Any`-typed output, for exercising the non-wildcard direction (Any -> concrete is not valid). */
const anyProducer: ConnectionValidationNode = {
  id: "any-producer-1",
  label: "Any Producer",
  inputs: [],
  outputs: [{ id: "out", label: "Out", io: "output", type: "Any" }],
};

describe("isTypeCompatible", () => {
  it("matches identical types", () => {
    expect(isTypeCompatible("Dataset", "Dataset")).toBe(true);
  });

  it("rejects mismatched concrete types", () => {
    expect(isTypeCompatible("Dataset", "Model")).toBe(false);
  });

  it("treats an Any-typed input as a wildcard for any concrete source type", () => {
    expect(isTypeCompatible("Dataset", "Any")).toBe(true);
  });

  it("does not treat an Any-typed output as a wildcard into a concrete input", () => {
    expect(isTypeCompatible("Any", "Model")).toBe(false);
  });
});

describe("inputHasExistingOutput", () => {
  const inputHandle: ConnectionValidationNode["inputs"][number] = {
    id: "dataset",
    label: "Dataset",
    io: "input",
    type: "Dataset",
  };

  it("is false when no edge targets this node's handle", () => {
    expect(inputHasExistingOutput("transform-1", inputHandle, [])).toBe(false);
  });

  it("is true when an edge already targets this exact node + handle pair", () => {
    const edges: ConnectionValidationEdge[] = [
      { source: "datasource-1", target: "transform-1", targetHandle: "dataset" },
    ];
    expect(inputHasExistingOutput("transform-1", inputHandle, edges)).toBe(
      true
    );
  });

  it("is false for an edge with a matching handle id but on a different node (handle ids aren't globally unique)", () => {
    const edges: ConnectionValidationEdge[] = [
      { source: "datasource-1", target: "model-1", targetHandle: "dataset" },
    ];
    expect(inputHasExistingOutput("transform-1", inputHandle, edges)).toBe(
      false
    );
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

  it("rejects a connection from an Any-typed output into a concrete input", () => {
    const result = validateConnection(
      {
        source: "any-producer-1",
        sourceHandle: "out",
        target: "transform-1",
        targetHandle: "dataset",
      },
      [anyProducer, transform],
      []
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("incompatible-type");
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

  it("rejects a second connection into an input handle that's already fed by an edge (§C2)", () => {
    const existingEdges: ConnectionValidationEdge[] = [
      {
        source: "datasource-1",
        sourceHandle: "dataset",
        target: "transform-1",
        targetHandle: "dataset",
      },
    ];

    const result = validateConnection(
      {
        source: "model-1",
        sourceHandle: "model",
        target: "transform-1",
        targetHandle: "dataset",
      },
      [dataSource, transform, model],
      existingEdges
    );

    expect(result.valid).toBe(false);
    expect(result.reason).toBe("existing-input");
  });

  it("still allows an output handle to fan out to multiple input handles (only inputs are single-edge)", () => {
    const existingEdges: ConnectionValidationEdge[] = [
      {
        source: "datasource-1",
        sourceHandle: "dataset",
        target: "transform-1",
        targetHandle: "dataset",
      },
    ];

    const anotherConsumer: ConnectionValidationNode = {
      id: "any-consumer-1",
      label: "Any Consumer",
      inputs: [{ id: "in", label: "In", io: "input", type: "Any" }],
      outputs: [],
    };

    const result = validateConnection(
      {
        source: "datasource-1",
        sourceHandle: "dataset",
        target: "any-consumer-1",
        targetHandle: "in",
      },
      [dataSource, transform, anotherConsumer],
      existingEdges
    );

    expect(result.valid).toBe(true);
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
      label: "A",
      inputs: [{ id: "in", label: "In", io: "input", type: "Dataset" }],
      outputs: [{ id: "out", label: "Out", io: "output", type: "Dataset" }],
    };
    const b: ConnectionValidationNode = {
      id: "b",
      label: "B",
      inputs: [{ id: "in", label: "In", io: "input", type: "Dataset" }],
      outputs: [{ id: "out", label: "Out", io: "output", type: "Dataset" }],
    };
    const existingEdges: ConnectionValidationEdge[] = [
      { source: "a", sourceHandle: "out", target: "b", targetHandle: "in" },
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
      label: "A",
      inputs: [{ id: "in", label: "In", io: "input", type: "Dataset" }],
      outputs: [{ id: "out", label: "Out", io: "output", type: "Dataset" }],
    };
    const b: ConnectionValidationNode = {
      id: "b",
      label: "B",
      inputs: [{ id: "in", label: "In", io: "input", type: "Dataset" }],
      outputs: [{ id: "out", label: "Out", io: "output", type: "Dataset" }],
    };
    const existingEdges: ConnectionValidationEdge[] = [
      { source: "a", sourceHandle: "out", target: "b", targetHandle: "in" },
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
      label: "A",
      inputs: [{ id: "in", label: "In", io: "input", type: "Dataset" }],
      outputs: [{ id: "out", label: "Out", io: "output", type: "Dataset" }],
    };
    const b: ConnectionValidationNode = {
      id: "b",
      label: "B",
      inputs: [{ id: "in", label: "In", io: "input", type: "Dataset" }],
      outputs: [{ id: "out", label: "Out", io: "output", type: "Dataset" }],
    };
    const c: ConnectionValidationNode = {
      id: "c",
      label: "C",
      inputs: [{ id: "in", label: "In", io: "input", type: "Dataset" }],
      outputs: [{ id: "out", label: "Out", io: "output", type: "Dataset" }],
    };
    const existingEdges: ConnectionValidationEdge[] = [
      { source: "a", sourceHandle: "out", target: "b", targetHandle: "in" },
      { source: "b", sourceHandle: "out", target: "c", targetHandle: "in" },
    ];

    const result = validateConnection(
      { source: "c", sourceHandle: "out", target: "a", targetHandle: "in" },
      [a, b, c],
      existingEdges
    );

    expect(result.valid).toBe(false);
    expect(result.reason).toBe("circular-reference");
  });

  it("allows the A -> B -> C shortcut A -> C into a second input handle on C (not a cycle)", () => {
    const a: ConnectionValidationNode = {
      id: "a",
      label: "A",
      inputs: [],
      outputs: [{ id: "out", label: "Out", io: "output", type: "Dataset" }],
    };
    const b: ConnectionValidationNode = {
      id: "b",
      label: "B",
      inputs: [{ id: "in", label: "In", io: "input", type: "Dataset" }],
      outputs: [{ id: "out", label: "Out", io: "output", type: "Dataset" }],
    };
    const c: ConnectionValidationNode = {
      id: "c",
      label: "C",
      inputs: [
        { id: "in-1", label: "In 1", io: "input", type: "Dataset" },
        { id: "in-2", label: "In 2", io: "input", type: "Dataset" },
      ],
      outputs: [],
    };
    const existingEdges: ConnectionValidationEdge[] = [
      { source: "a", sourceHandle: "out", target: "b", targetHandle: "in" },
      { source: "b", sourceHandle: "out", target: "c", targetHandle: "in-1" },
    ];

    const result = validateConnection(
      { source: "a", sourceHandle: "out", target: "c", targetHandle: "in-2" },
      [a, b, c],
      existingEdges
    );

    expect(result).toEqual({ valid: true });
  });

  it("rejects B -> A when A -> B -> C already exists (a real cycle, not the A -> C shortcut)", () => {
    const a: ConnectionValidationNode = {
      id: "a",
      label: "A",
      inputs: [{ id: "in", label: "In", io: "input", type: "Dataset" }],
      outputs: [{ id: "out", label: "Out", io: "output", type: "Dataset" }],
    };
    const b: ConnectionValidationNode = {
      id: "b",
      label: "B",
      inputs: [{ id: "in", label: "In", io: "input", type: "Dataset" }],
      outputs: [{ id: "out", label: "Out", io: "output", type: "Dataset" }],
    };
    const c: ConnectionValidationNode = {
      id: "c",
      label: "C",
      inputs: [{ id: "in", label: "In", io: "input", type: "Dataset" }],
      outputs: [],
    };
    const existingEdges: ConnectionValidationEdge[] = [
      { source: "a", sourceHandle: "out", target: "b", targetHandle: "in" },
      { source: "b", sourceHandle: "out", target: "c", targetHandle: "in" },
    ];

    const result = validateConnection(
      { source: "b", sourceHandle: "out", target: "a", targetHandle: "in" },
      [a, b, c],
      existingEdges
    );

    expect(result.valid).toBe(false);
    expect(result.reason).toBe("circular-reference");
  });

  it("accepts a connection that fans an output out to a second, independent branch (not a cycle)", () => {
    const a: ConnectionValidationNode = {
      id: "a",
      label: "A",
      inputs: [],
      outputs: [{ id: "out", label: "Out", io: "output", type: "Dataset" }],
    };
    const b: ConnectionValidationNode = {
      id: "b",
      label: "B",
      inputs: [{ id: "in", label: "In", io: "input", type: "Dataset" }],
      outputs: [],
    };
    const c: ConnectionValidationNode = {
      id: "c",
      label: "C",
      inputs: [{ id: "in", label: "In", io: "input", type: "Dataset" }],
      outputs: [],
    };
    const existingEdges: ConnectionValidationEdge[] = [
      { source: "a", sourceHandle: "out", target: "b", targetHandle: "in" },
    ];

    const result = validateConnection(
      { source: "a", sourceHandle: "out", target: "c", targetHandle: "in" },
      [a, b, c],
      existingEdges
    );

    expect(result).toEqual({ valid: true });
  });
});
