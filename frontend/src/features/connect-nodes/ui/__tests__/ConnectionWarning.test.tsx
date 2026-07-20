import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ConnectionWarning } from "../ConnectionWarning";

describe("ConnectionWarning", () => {
  it("renders nothing when there is no warning", () => {
    const { container } = render(<ConnectionWarning warning={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the message with an orange background when a warning is present", () => {
    render(
      <ConnectionWarning
        warning={{
          message: "Cannot connect Model to Dataset.",
          x: 100,
          y: 200,
        }}
      />
    );

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Cannot connect Model to Dataset.");
    expect(alert.className).toMatch(/bg-orange/);
  });

  it("positions itself at the given point, anchored above it", () => {
    render(
      <ConnectionWarning
        warning={{
          message: "A node cannot connect to itself.",
          x: 150,
          y: 250,
        }}
      />
    );

    const alert = screen.getByRole("alert");
    expect(alert.style.left).toBe("150px");
    // "Above" the release point: the anchor is <= y, never below it.
    expect(parseFloat(alert.style.top)).toBeLessThanOrEqual(250);
  });

  it("does not intercept pointer events, so it cannot appear to track the cursor", () => {
    render(
      <ConnectionWarning
        warning={{
          message: "This connection would create a circular reference.",
          x: 0,
          y: 0,
        }}
      />
    );

    expect(screen.getByRole("alert").className).toMatch(/pointer-events-none/);
  });
});
