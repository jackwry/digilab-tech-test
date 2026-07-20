import { describe, expect, it } from "vitest";

import { generateDefaultWorkflowName } from "../workflowName";

describe("generateDefaultWorkflowName", () => {
  it("returns 'Workflow ' followed by 4 uppercase alphanumeric characters", () => {
    const name = generateDefaultWorkflowName();

    expect(name).toMatch(/^Workflow [A-Z0-9]{4}$/);
  });

  it("generates different names across calls", () => {
    const names = new Set(
      Array.from({ length: 20 }, () => generateDefaultWorkflowName())
    );

    expect(names.size).toBeGreaterThan(1);
  });
});
