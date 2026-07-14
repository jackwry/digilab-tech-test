import { describe, expect, it } from "vitest";

import { NODE_DEFINITIONS } from "../nodeDefinitions";

/**
 * An example test so the Vitest setup is proven to work. Replace/extend it with
 * the behaviour you consider most important (see the brief's "Testing"
 * section) — for example the connection-compatibility matrix, the validation
 * rules, or your editor's state transitions.
 */
describe("NODE_DEFINITIONS", () => {
  it("gives DataSource an output and no inputs", () => {
    expect(NODE_DEFINITIONS.DataSource.inputs).toHaveLength(0);
    expect(NODE_DEFINITIONS.DataSource.outputs[0].type).toBe("Dataset");
  });

  it("gives Model a Model-typed output", () => {
    expect(NODE_DEFINITIONS.Model.outputs[0].type).toBe("Model");
  });
});
