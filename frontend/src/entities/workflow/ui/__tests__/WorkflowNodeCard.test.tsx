import { ReactFlowProvider, type NodeProps } from "@xyflow/react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { useState } from "react";

import type { FlowNode, WorkflowNodeData } from "../../model/flowTypes";
import { WorkflowNodeCard } from "../WorkflowNodeCard";

function buildProps(
  overrides: Partial<NodeProps<FlowNode>> = {}
): NodeProps<FlowNode> {
  return {
    id: "node-1",
    type: "workflowNode",
    selected: false,
    isConnectable: true,
    zIndex: 0,
    dragging: false,
    positionAbsoluteX: 0,
    positionAbsoluteY: 0,
    ...overrides,

    data: {
      label: "My Node",
      nodeType: "DataSource",
      inputs: [],
      outputs: [],
      ...overrides.data,
    },
  } as NodeProps<FlowNode>;
}

function renderCard(
  props: Partial<NodeProps<FlowNode>> = {},
  onLabelChange = vi.fn(),
  onDelete = vi.fn()
) {
  const built = buildProps(props);
  const rendered = render(
    <ReactFlowProvider>
      <WorkflowNodeCard
        {...built}
        onLabelChange={onLabelChange}
        onDelete={onDelete}
      />
    </ReactFlowProvider>
  );
  return { rendered, onLabelChange, onDelete, id: built.id };
}

/**
 * Mirrors how the real app wires this up: `onLabelChange` feeds back into
 * `setNodes`, so the parent re-renders the card with the committed label as
 * its new `data` prop (see `useWorkflowStore` / `WorkflowCanvas`).
 */
function renderControlledCard(props: Partial<NodeProps<FlowNode>> = {}) {
  const built = buildProps(props);
  const onLabelChange = vi.fn();

  function Harness() {
    const [label, setLabel] = useState(built.data.label);
    const handleLabelChange = (id: string, newLabel: string) => {
      onLabelChange(id, newLabel);
      setLabel(newLabel);
    };
    return (
      <WorkflowNodeCard
        {...built}
        data={{ ...built.data, label }}
        onLabelChange={handleLabelChange}
      />
    );
  }

  render(
    <ReactFlowProvider>
      <Harness />
    </ReactFlowProvider>
  );
  return { onLabelChange, id: built.id };
}

function editButton() {
  return screen.getByRole("button", { name: /edit label/i });
}

function deleteButton() {
  return screen.getByRole("button", { name: /delete node/i });
}

describe("WorkflowNodeCard", () => {
  it("keeps inputs pinned to the left edge and outputs to the right edge", () => {
    const {
      rendered: { container },
    } = renderCard({
      data: {
        inputs: [{ id: "input-1", label: "Input 1", type: "Dataset" }],
        outputs: [{ id: "output-1", label: "Output 1", type: "Model" }],
      } as WorkflowNodeData,
    });

    const input = container.querySelector(".react-flow__handle.target");
    const output = container.querySelector(".react-flow__handle.source");

    expect(input).toHaveClass("react-flow__handle-left");
    expect(output).toHaveClass("react-flow__handle-right");
  });

  it("shapes each handle as a small circle", () => {
    const {
      rendered: { container },
    } = renderCard({
      data: {
        inputs: [{ id: "input-1", label: "Input 1", type: "Dataset" }],
        outputs: [{ id: "output-1", label: "Output 1", type: "Model" }],
      } as WorkflowNodeData,
    });

    const input = container.querySelector(
      ".react-flow__handle.target"
    ) as HTMLElement;
    const output = container.querySelector(
      ".react-flow__handle.source"
    ) as HTMLElement;

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
    const {
      rendered: { getAllByText, getByText },
    } = renderCard({
      data: { nodeType: "Model", label: "My Model" } as WorkflowNodeData,
    });

    // "Model" appears both in the header and as the output handle's label.
    expect(getAllByText("Model").length).toBeGreaterThanOrEqual(1);
    expect(getByText("My Model")).toBeInTheDocument();
  });
});

describe("WorkflowNodeCard label editing", () => {
  it("renders the label as static text by default, with the edit icon present but hover-revealed", () => {
    renderCard();

    expect(screen.getByText("My Node")).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(editButton()).toHaveClass("opacity-0");
  });

  it("enters edit mode when the edit icon is clicked, showing a focused textbox with the current label", async () => {
    const user = userEvent.setup();
    renderCard();

    await user.click(editButton());

    const input = screen.getByRole("textbox");
    expect(input).toBeInTheDocument();
    expect(input).toHaveValue("My Node");
    expect(input).toHaveFocus();
  });

  it("commits the new label on Enter and exits edit mode", async () => {
    const user = userEvent.setup();
    const { onLabelChange, id } = renderControlledCard();

    await user.click(editButton());
    const input = screen.getByRole("textbox");
    await user.clear(input);
    await user.type(input, "Renamed Node{Enter}");

    expect(onLabelChange).toHaveBeenCalledExactlyOnceWith(id, "Renamed Node");
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.getByText("Renamed Node")).toBeInTheDocument();
  });

  it("commits the new label on blur", async () => {
    const user = userEvent.setup();
    const { onLabelChange, id } = renderControlledCard();

    await user.click(editButton());
    const input = screen.getByRole("textbox");
    await user.clear(input);
    await user.type(input, "Blurred Rename");
    await user.tab();

    expect(onLabelChange).toHaveBeenCalledExactlyOnceWith(id, "Blurred Rename");
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("trims surrounding whitespace before committing", async () => {
    const user = userEvent.setup();
    const { onLabelChange, id } = renderCard();

    await user.click(editButton());
    const input = screen.getByRole("textbox");
    await user.clear(input);
    await user.type(input, "  Padded Name  {Enter}");

    expect(onLabelChange).toHaveBeenCalledExactlyOnceWith(id, "Padded Name");
  });

  it("cancels the edit on Escape, reverting to the original label without committing", async () => {
    const user = userEvent.setup();
    const { onLabelChange } = renderCard();

    await user.click(editButton());
    const input = screen.getByRole("textbox");
    await user.clear(input);
    await user.type(input, "Should Not Save");
    await user.keyboard("{Escape}");

    expect(onLabelChange).not.toHaveBeenCalled();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.getByText("My Node")).toBeInTheDocument();
  });

  it("reverts to the previous label instead of committing an empty label", async () => {
    const user = userEvent.setup();
    const { onLabelChange } = renderCard();

    await user.click(editButton());
    const input = screen.getByRole("textbox");
    await user.clear(input);
    await user.type(input, "   {Enter}");

    expect(onLabelChange).not.toHaveBeenCalled();
    expect(screen.getByText("My Node")).toBeInTheDocument();
  });

  it("does not call onLabelChange when the label is unchanged", async () => {
    const user = userEvent.setup();
    const { onLabelChange } = renderCard();

    await user.click(editButton());
    await user.keyboard("{Enter}");

    expect(onLabelChange).not.toHaveBeenCalled();
  });
});

describe("WorkflowNodeCard node deletion", () => {
  it("renders a delete button that is visible without hovering", () => {
    renderCard();

    const button = deleteButton();
    expect(button).toBeInTheDocument();
    expect(button).not.toHaveClass("opacity-0");
  });

  it("calls onDelete with the node's id immediately when clicked, with no confirmation step", async () => {
    const user = userEvent.setup();
    const { onDelete, id } = renderCard();

    await user.click(deleteButton());

    expect(onDelete).toHaveBeenCalledExactlyOnceWith(id);
  });
});
