import { ReactFlow, ReactFlowProvider } from "@xyflow/react";
import { render, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { createFlowNode } from "../../model/nodeFactory";
import type { NodeType } from "../../model/types";
import { WorkflowNodeCard } from "../WorkflowNodeCard";

const nodeTypes = { workflowNode: WorkflowNodeCard };

function renderNode(nodeType: NodeType, label?: string) {
  const node = createFlowNode({ nodeType, position: { x: 0, y: 0 }, label });
  return render(
    <ReactFlowProvider>
      <ReactFlow nodes={[node]} edges={[]} nodeTypes={nodeTypes} />
    </ReactFlowProvider>,
  );
}

describe("WorkflowNodeCard", () => {
  it("renders a DataSource node with only a Dataset output handle", () => {
    const { container } = renderNode("DataSource");

    expect(container.querySelectorAll(".react-flow__handle.target")).toHaveLength(0);

    const outputs = container.querySelectorAll(".react-flow__handle.source");
    expect(outputs).toHaveLength(1);
    expect(outputs[0]).toHaveAttribute("title", "Dataset");
    expect(within(outputs[0] as HTMLElement).getByText("Dataset")).toBeInTheDocument();
  });

  it("renders a Transform node with a Dataset input and a Dataset output", () => {
    const { container } = renderNode("Transform");

    const inputs = container.querySelectorAll(".react-flow__handle.target");
    const outputs = container.querySelectorAll(".react-flow__handle.source");

    expect(inputs).toHaveLength(1);
    expect(inputs[0]).toHaveAttribute("title", "Dataset");
    expect(within(inputs[0] as HTMLElement).getByText("Dataset")).toBeInTheDocument();

    expect(outputs).toHaveLength(1);
    expect(within(outputs[0] as HTMLElement).getByText("Dataset")).toBeInTheDocument();
  });

  it("renders a Model node with a Dataset input and a Model output", () => {
    const { container } = renderNode("Model");

    const inputs = container.querySelectorAll(".react-flow__handle.target");
    const outputs = container.querySelectorAll(".react-flow__handle.source");

    expect(within(inputs[0] as HTMLElement).getByText("Dataset")).toBeInTheDocument();

    expect(outputs).toHaveLength(1);
    expect(outputs[0]).toHaveAttribute("title", "Model");
    expect(within(outputs[0] as HTMLElement).getByText("Model")).toBeInTheDocument();
  });

  it("keeps inputs pinned to the left edge and outputs to the right edge", () => {
    const { container } = renderNode("Transform");

    const input = container.querySelector(".react-flow__handle.target");
    const output = container.querySelector(".react-flow__handle.source");

    expect(input).toHaveClass("react-flow__handle-left");
    expect(output).toHaveClass("react-flow__handle-right");
  });

  it("shapes each handle as a small circle", () => {
    const { container } = renderNode("Transform");

    const input = container.querySelector(".react-flow__handle.target") as HTMLElement;
    const output = container.querySelector(".react-flow__handle.source") as HTMLElement;

    // Asserted via inline style, not a class: ReactFlow's own unlayered
    // stylesheet beats Tailwind's layered utilities for these properties, so
    // the component sets them inline (see the comment in WorkflowNodeCard.tsx).
    for (const handle of [input, output]) {
      expect(handle.style.borderRadius).toBe("9999px");
      expect(handle.style.width).toBe("10px");
      expect(handle.style.height).toBe("10px");
    }
  });

  it("shows the node type and the (possibly distinct) node label in the header", () => {
    const { getAllByText, getByText } = renderNode("Model", "My Model");

    // "Model" appears both in the header and as the output handle's label.
    expect(getAllByText("Model").length).toBeGreaterThanOrEqual(1);
    expect(getByText("My Model")).toBeInTheDocument();
  });
});
