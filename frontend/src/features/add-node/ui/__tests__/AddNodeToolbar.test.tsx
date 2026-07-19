import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { AddNodeToolbar } from "../AddNodeToolbar";

describe("AddNodeToolbar", () => {
  it("hides the node type menu until the trigger is opened", () => {
    render(<AddNodeToolbar onAdd={() => {}} />);

    expect(
      screen.getByRole("button", { name: /add node/i })
    ).toBeInTheDocument();
    expect(screen.queryByRole("menuitem")).not.toBeInTheDocument();
  });

  it("shows a menu item for each node type, in readable text with a short description of what it does", async () => {
    const user = userEvent.setup();
    render(<AddNodeToolbar onAdd={() => {}} />);

    await user.click(screen.getByRole("button", { name: /add node/i }));

    expect(
      screen.getByRole("menuitem", { name: /Data Source.*Add a dataset source/ })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("menuitem", { name: /Transform.*Transform a dataset/ })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("menuitem", {
        name: /Model.*Train a model from a dataset/,
      })
    ).toBeInTheDocument();
  });

  it("calls onAdd with the chosen node type and closes the menu", async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();
    render(<AddNodeToolbar onAdd={onAdd} />);

    await user.click(screen.getByRole("button", { name: /add node/i }));
    await user.click(screen.getByRole("menuitem", { name: /^Transform/ }));

    expect(onAdd).toHaveBeenCalledExactlyOnceWith("Transform");
    expect(screen.queryByRole("menuitem")).not.toBeInTheDocument();
  });
});
