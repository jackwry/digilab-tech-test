import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ServerErrorDialog } from "../ServerErrorDialog";

describe("ServerErrorDialog", () => {
  it("shows an explanation that saving is currently failing", () => {
    render(<ServerErrorDialog onDismiss={() => {}} />);

    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(screen.getByText(/having trouble saving/i)).toBeInTheDocument();
  });

  it("calls onDismiss when the dismiss button is clicked", async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();
    render(<ServerErrorDialog onDismiss={onDismiss} />);

    await user.click(screen.getByRole("button", { name: "Dismiss" }));

    expect(onDismiss).toHaveBeenCalledOnce();
  });
});
