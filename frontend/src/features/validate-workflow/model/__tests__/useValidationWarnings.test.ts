import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useValidationWarnings } from "../useValidationWarnings";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useValidationWarnings", () => {
  it("starts with no warnings", () => {
    const { result } = renderHook(() => useValidationWarnings());

    expect(result.current.warnings).toEqual([]);
  });

  it("adds a warning with the given message and level", () => {
    const { result } = renderHook(() => useValidationWarnings());

    act(() => {
      result.current.pushWarning("Something is wrong", "warning");
    });

    expect(result.current.warnings).toHaveLength(1);
    expect(result.current.warnings[0]).toMatchObject({
      message: "Something is wrong",
      level: "warning",
    });
  });

  it("stacks multiple warnings", () => {
    const { result } = renderHook(() => useValidationWarnings());

    act(() => {
      result.current.pushWarning("First", "warning");
      result.current.pushWarning("Second", "error");
    });

    expect(result.current.warnings).toHaveLength(2);
    expect(result.current.warnings.map((w) => w.message)).toEqual([
      "First",
      "Second",
    ]);
  });

  it("auto-dismisses a warning after 5 seconds", () => {
    const { result } = renderHook(() => useValidationWarnings());

    act(() => {
      result.current.pushWarning("Fades away", "warning");
    });
    expect(result.current.warnings).toHaveLength(1);

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(result.current.warnings).toHaveLength(0);
  });

  it("dismisses a specific warning by id when asked", () => {
    const { result } = renderHook(() => useValidationWarnings());

    act(() => {
      result.current.pushWarning("First", "warning");
      result.current.pushWarning("Second", "warning");
    });
    const [first, second] = result.current.warnings;

    act(() => {
      result.current.dismiss(first.id);
    });

    expect(result.current.warnings).toEqual([second]);
  });
});
