import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReactFlowProvider, type NodeProps } from "@xyflow/react";
import { describe, expect, it, vi } from "vitest";

import type { FlowNode } from "../../model/flowTypes";
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
    data: {
      label: "My Node",
      nodeType: "DataSource",
      inputs: [],
      outputs: [],
    },
    ...overrides,
  } as NodeProps<FlowNode>;
}

function renderCard(
  props: Partial<NodeProps<FlowNode>> = {},
  onLabelChange = vi.fn(),
  onDelete = vi.fn()
) {
  const built = buildProps(props);
  render(
    <ReactFlowProvider>
      <WorkflowNodeCard
        {...built}
        onLabelChange={onLabelChange}
        onDelete={onDelete}
      />
    </ReactFlowProvider>
  );
  return { onLabelChange, onDelete, id: built.id };
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
