import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { SaveWorkflowButton } from "../SaveWorkflowButton";

describe("SaveWorkflowButton", () => {
  it("calls onSave when clicked", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(
      <SaveWorkflowButton
        status="idle"
        isDirty={false}
        lastSavedAt={null}
        onSave={onSave}
      />
    );

    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(onSave).toHaveBeenCalledOnce();
  });

  it("disables the button while loading or saving", () => {
    const { rerender } = render(
      <SaveWorkflowButton
        status="loading"
        isDirty={false}
        lastSavedAt={null}
        onSave={() => {}}
      />
    );
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();

    rerender(
      <SaveWorkflowButton
        status="saving"
        isDirty={false}
        lastSavedAt={null}
        onSave={() => {}}
      />
    );
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();

    rerender(
      <SaveWorkflowButton
        status="idle"
        isDirty={false}
        lastSavedAt={null}
        onSave={() => {}}
      />
    );
    expect(screen.getByRole("button", { name: "Save" })).toBeEnabled();
  });

  it("shows a 'Saving…' pill while saving, and specific text for error/invalid states", () => {
    const { rerender } = render(
      <SaveWorkflowButton
        status="saving"
        isDirty={true}
        lastSavedAt={null}
        onSave={() => {}}
      />
    );
    expect(screen.getByText("Saving…")).toBeInTheDocument();

    rerender(
      <SaveWorkflowButton
        status="error"
        isDirty={true}
        lastSavedAt={null}
        onSave={() => {}}
      />
    );
    expect(screen.getByText("Failed to save")).toBeInTheDocument();

    rerender(
      <SaveWorkflowButton
        status="invalid"
        isDirty={true}
        lastSavedAt={null}
        onSave={() => {}}
      />
    );
    expect(screen.getByText("Fix the issues below to save")).toBeInTheDocument();
  });

  it("shows an 'Unsaved changes' pill when dirty, and a 'Saved' pill when clean", () => {
    const { rerender } = render(
      <SaveWorkflowButton
        status="idle"
        isDirty={true}
        lastSavedAt={null}
        onSave={() => {}}
      />
    );
    expect(screen.getByText("Unsaved changes")).toBeInTheDocument();

    rerender(
      <SaveWorkflowButton
        status="idle"
        isDirty={false}
        lastSavedAt={null}
        onSave={() => {}}
      />
    );
    expect(screen.getByText("Saved")).toBeInTheDocument();
  });

  it("colors the pill green when saved, yellow when dirty, and red on a failed save", () => {
    const { rerender } = render(
      <SaveWorkflowButton
        status="idle"
        isDirty={false}
        lastSavedAt={null}
        onSave={() => {}}
      />
    );
    expect(screen.getByText("Saved")).toHaveClass("bg-green-600");

    rerender(
      <SaveWorkflowButton
        status="idle"
        isDirty={true}
        lastSavedAt={null}
        onSave={() => {}}
      />
    );
    expect(screen.getByText("Unsaved changes")).toHaveClass("bg-yellow-400");

    rerender(
      <SaveWorkflowButton
        status="error"
        isDirty={true}
        lastSavedAt={null}
        onSave={() => {}}
      />
    );
    expect(screen.getByText("Unsaved changes")).toHaveClass("bg-red-600");

    rerender(
      <SaveWorkflowButton
        status="invalid"
        isDirty={false}
        lastSavedAt={null}
        onSave={() => {}}
      />
    );
    expect(screen.getByText("Saved")).toHaveClass("bg-red-600");
  });

  it("always shows the last-saved time, even before anything has been saved", () => {
    render(
      <SaveWorkflowButton
        status="idle"
        isDirty={true}
        lastSavedAt={null}
        onSave={() => {}}
      />
    );

    expect(screen.getByText("Not saved yet")).toBeInTheDocument();
  });

  it("shows a formatted last-saved time once the workflow has been saved", () => {
    render(
      <SaveWorkflowButton
        status="idle"
        isDirty={false}
        lastSavedAt="2026-07-20T09:05:00.000Z"
        onSave={() => {}}
      />
    );

    expect(screen.getByText(/^Last saved /)).toBeInTheDocument();
  });
});
