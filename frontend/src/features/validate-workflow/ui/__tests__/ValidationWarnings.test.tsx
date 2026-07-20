import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { WarningToast } from "../../model/useValidationWarnings";
import { ValidationWarnings } from "../ValidationWarnings";

function toast(overrides: Partial<WarningToast> = {}): WarningToast {
  return { id: "warning-0", message: "Something is wrong", level: "warning", ...overrides };
}

describe("ValidationWarnings", () => {
  it("renders nothing when there are no warnings", () => {
    const { container } = render(
      <ValidationWarnings warnings={[]} onDismiss={vi.fn()} />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("renders each warning's message", () => {
    render(
      <ValidationWarnings
        warnings={[toast({ id: "a", message: "First" }), toast({ id: "b", message: "Second" })]}
        onDismiss={vi.fn()}
      />
    );

    expect(screen.getByText("First")).toBeInTheDocument();
    expect(screen.getByText("Second")).toBeInTheDocument();
  });

  it("calls onDismiss with the warning's id when its close button is clicked", async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();
    render(
      <ValidationWarnings warnings={[toast({ id: "a" })]} onDismiss={onDismiss} />
    );

    await user.click(screen.getByRole("button", { name: /dismiss/i }));

    expect(onDismiss).toHaveBeenCalledWith("a");
  });

  it("distinguishes error-level warnings from warning-level ones", () => {
    render(
      <ValidationWarnings
        warnings={[toast({ id: "a", level: "error", message: "Bad request" })]}
        onDismiss={vi.fn()}
      />
    );

    expect(screen.getByRole("alert")).toHaveAttribute("data-level", "error");
  });
});
