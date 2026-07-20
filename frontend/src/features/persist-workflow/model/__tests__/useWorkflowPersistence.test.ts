import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { FlowNode, Workflow } from "@/entities/workflow";

const { getWorkflow, updateWorkflow } = vi.hoisted(() => ({
  getWorkflow: vi.fn(),
  updateWorkflow: vi.fn(),
}));

vi.mock("@/entities/workflow", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/entities/workflow")>();
  return { ...actual, getWorkflow, updateWorkflow };
});

import { useWorkflowStore } from "@/entities/workflow";

import { useWorkflowPersistence } from "../useWorkflowPersistence";

function makeWorkflow(overrides: Partial<Workflow> = {}): Workflow {
  return {
    id: "server-1",
    name: "Untitled workflow",
    nodes: [],
    edges: [],
    ...overrides,
  };
}

function makeNode(id: string): FlowNode {
  return {
    id,
    type: "workflowNode",
    position: { x: 0, y: 0 },
    data: { label: id, nodeType: "Transform", inputs: [], outputs: [] },
  };
}

function notFoundError(): Error {
  return Object.assign(new Error("not found"), {
    isAxiosError: true,
    response: { status: 404 },
  });
}

function apiError(
  status: number,
  errors: { code: string; message: string; level?: string }[]
): Error {
  return Object.assign(new Error("request failed"), {
    isAxiosError: true,
    response: { status, data: { errors } },
  });
}

beforeEach(() => {
  getWorkflow.mockReset();
  updateWorkflow.mockReset();
  useWorkflowStore.setState({ nodes: [], edges: [] });
});

describe("useWorkflowPersistence", () => {
  it("fetches the workflow at the given id on load", async () => {
    getWorkflow.mockResolvedValue(
      makeWorkflow({ id: "server-1", name: "My workflow" })
    );

    const { result } = renderHook(() =>
      useWorkflowPersistence("server-1", vi.fn())
    );

    await waitFor(() => expect(result.current.status).toBe("idle"));

    expect(getWorkflow).toHaveBeenCalledWith("server-1");
  });

  it("reports a not-found status when the id 404s", async () => {
    getWorkflow.mockRejectedValue(notFoundError());

    const { result } = renderHook(() =>
      useWorkflowPersistence("missing-id", vi.fn())
    );

    await waitFor(() => expect(result.current.status).toBe("not-found"));
  });

  it("surfaces an error status when loading fails for a non-404 reason", async () => {
    getWorkflow.mockRejectedValue(new Error("network down"));

    const { result } = renderHook(() =>
      useWorkflowPersistence("server-1", vi.fn())
    );

    await waitFor(() => expect(result.current.status).toBe("error"));

    expect(result.current.error).toBeTruthy();
  });

  it("saves the current canvas state to the given id", async () => {
    getWorkflow.mockResolvedValue(makeWorkflow({ id: "server-1" }));
    updateWorkflow.mockResolvedValue(makeWorkflow({ id: "server-1" }));

    const { result } = renderHook(() =>
      useWorkflowPersistence("server-1", vi.fn())
    );
    await waitFor(() => expect(result.current.status).toBe("idle"));

    await act(async () => {
      await result.current.save();
    });

    expect(updateWorkflow).toHaveBeenCalledWith(
      "server-1",
      expect.objectContaining({ name: "Untitled workflow" })
    );
    expect(result.current.status).toBe("saved");
  });

  it("reloads the workflow when the id changes", async () => {
    getWorkflow.mockImplementation((id: string) =>
      Promise.resolve(makeWorkflow({ id, name: `Workflow ${id}` }))
    );

    const { result, rerender } = renderHook(
      ({ id }) => useWorkflowPersistence(id, vi.fn()),
      { initialProps: { id: "server-1" } }
    );
    await waitFor(() => expect(result.current.status).toBe("idle"));
    expect(getWorkflow).toHaveBeenCalledWith("server-1");

    rerender({ id: "server-2" });
    await waitFor(() => expect(getWorkflow).toHaveBeenCalledWith("server-2"));
  });

  it("blocks the save and reports each violation as an error when the workflow fails client-side validation", async () => {
    getWorkflow.mockResolvedValue(makeWorkflow({ id: "server-1" }));
    const onWarning = vi.fn();

    const { result } = renderHook(() =>
      useWorkflowPersistence("server-1", onWarning)
    );
    await waitFor(() => expect(result.current.status).toBe("idle"));

    act(() => {
      useWorkflowStore.setState({
        nodes: [makeNode("dup"), makeNode("dup")],
        edges: [],
      });
    });

    await act(async () => {
      await result.current.save();
    });

    expect(updateWorkflow).not.toHaveBeenCalled();
    expect(result.current.status).toBe("invalid");
    expect(onWarning).toHaveBeenCalledWith(
      expect.stringContaining("dup"),
      "error"
    );
  });

  it("reports each structured API error when the backend rejects an invalid workflow", async () => {
    getWorkflow.mockResolvedValue(makeWorkflow({ id: "server-1" }));
    updateWorkflow.mockRejectedValue(
      apiError(422, [
        { code: "DUPLICATE_NODE_ID", message: "Backend caught one" },
      ])
    );
    const onWarning = vi.fn();

    const { result } = renderHook(() =>
      useWorkflowPersistence("server-1", onWarning)
    );
    await waitFor(() => expect(result.current.status).toBe("idle"));

    await act(async () => {
      await result.current.save();
    });

    expect(result.current.status).toBe("error");
    expect(onWarning).toHaveBeenCalledWith("Backend caught one", "error");
  });

  it("reports each structured API error as an error-level warning on a failed save", async () => {
    getWorkflow.mockResolvedValue(makeWorkflow({ id: "server-1" }));
    updateWorkflow.mockRejectedValue(
      apiError(422, [{ code: "VALIDATION_ERROR", message: "name is required" }])
    );
    const onWarning = vi.fn();

    const { result } = renderHook(() =>
      useWorkflowPersistence("server-1", onWarning)
    );
    await waitFor(() => expect(result.current.status).toBe("idle"));

    await act(async () => {
      await result.current.save();
    });

    expect(result.current.status).toBe("error");
    expect(onWarning).toHaveBeenCalledWith("name is required", "error");
  });

  it("falls back to a generic error toast when a failed save has no structured body", async () => {
    getWorkflow.mockResolvedValue(makeWorkflow({ id: "server-1" }));
    updateWorkflow.mockRejectedValue(new Error("network down"));
    const onWarning = vi.fn();

    const { result } = renderHook(() =>
      useWorkflowPersistence("server-1", onWarning)
    );
    await waitFor(() => expect(result.current.status).toBe("idle"));

    await act(async () => {
      await result.current.save();
    });

    expect(result.current.status).toBe("error");
    expect(onWarning).toHaveBeenCalledWith(
      "Failed to save the workflow.",
      "error"
    );
  });
});
