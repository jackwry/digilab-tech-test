import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { SaveWorkflowButton } from "../SaveWorkflowButton";

describe("SaveWorkflowButton", () => {
  it("calls onSave when clicked", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<SaveWorkflowButton status="idle" onSave={onSave} />);

    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(onSave).toHaveBeenCalledOnce();
  });

  it("disables the button while loading or saving", () => {
    const { rerender } = render(
      <SaveWorkflowButton status="loading" onSave={() => {}} />
    );
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();

    rerender(<SaveWorkflowButton status="saving" onSave={() => {}} />);
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();

    rerender(<SaveWorkflowButton status="idle" onSave={() => {}} />);
    expect(screen.getByRole("button", { name: "Save" })).toBeEnabled();
  });

  it("shows status text for saving, saved, and error states", () => {
    const { rerender } = render(
      <SaveWorkflowButton status="saving" onSave={() => {}} />
    );
    expect(screen.getByText("Saving…")).toBeInTheDocument();

    rerender(<SaveWorkflowButton status="saved" onSave={() => {}} />);
    expect(screen.getByText("Saved")).toBeInTheDocument();

    rerender(<SaveWorkflowButton status="error" onSave={() => {}} />);
    expect(screen.getByText("Failed to save")).toBeInTheDocument();
  });
});
