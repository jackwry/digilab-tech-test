import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useConnectionWarning } from "../useConnectionWarning";

describe("useConnectionWarning", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts with no warning", () => {
    const { result } = renderHook(() => useConnectionWarning());
    expect(result.current.warning).toBeNull();
  });

  it("shows the message at the given point when triggered", () => {
    const { result } = renderHook(() => useConnectionWarning());

    act(() => {
      result.current.showWarning("Cannot connect Model to Dataset.", {
        x: 120,
        y: 340,
      });
    });

    expect(result.current.warning).toEqual({
      message: "Cannot connect Model to Dataset.",
      x: 120,
      y: 340,
    });
  });

  it("clears itself after 3 seconds", () => {
    const { result } = renderHook(() => useConnectionWarning());

    act(() => {
      result.current.showWarning("A node cannot connect to itself.", {
        x: 0,
        y: 0,
      });
    });
    expect(result.current.warning).not.toBeNull();

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(result.current.warning).toBeNull();
  });

  it("does not clear early, before the 3 second mark", () => {
    const { result } = renderHook(() => useConnectionWarning());

    act(() => {
      result.current.showWarning(
        "This connection would create a circular reference.",
        { x: 0, y: 0 }
      );
    });

    act(() => {
      vi.advanceTimersByTime(2999);
    });

    expect(result.current.warning).not.toBeNull();
  });

  it("restarts the timer if a new warning is shown before the previous one clears", () => {
    const { result } = renderHook(() => useConnectionWarning());

    act(() => {
      result.current.showWarning("first", { x: 0, y: 0 });
    });
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    act(() => {
      result.current.showWarning("second", { x: 10, y: 10 });
    });
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    // 4s have elapsed since the first call, but only 2s since the second —
    // the second warning should still be showing.
    expect(result.current.warning?.message).toBe("second");

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.warning).toBeNull();
  });
});
