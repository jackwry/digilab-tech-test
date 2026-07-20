import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Workflow } from "@/entities/workflow";

const { createWorkflow, getWorkflow, updateWorkflow } = vi.hoisted(() => ({
  createWorkflow: vi.fn(),
  getWorkflow: vi.fn(),
  updateWorkflow: vi.fn(),
}));

vi.mock("@/entities/workflow", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/entities/workflow")>();
  return { ...actual, createWorkflow, getWorkflow, updateWorkflow };
});

import { useWorkflowStore } from "@/entities/workflow";

import {
  STORAGE_KEY,
  WORKFLOW_LID,
  useWorkflowPersistence,
} from "../useWorkflowPersistence";

function makeWorkflow(overrides: Partial<Workflow> = {}): Workflow {
  return {
    id: "server-1",
    name: "Untitled workflow",
    nodes: [],
    edges: [],
    ...overrides,
  };
}

function notFoundError(): Error {
  return Object.assign(new Error("not found"), {
    isAxiosError: true,
    response: { status: 404 },
  });
}

beforeEach(() => {
  localStorage.clear();
  createWorkflow.mockReset();
  getWorkflow.mockReset();
  updateWorkflow.mockReset();
  useWorkflowStore.setState({ nodes: [], edges: [] });
});

describe("useWorkflowPersistence", () => {
  it("creates a new workflow with the fixed lid when there's no cached id", async () => {
    createWorkflow.mockResolvedValue(makeWorkflow({ id: "server-1" }));

    const { result } = renderHook(() => useWorkflowPersistence());

    await waitFor(() => expect(result.current.status).toBe("idle"));

    expect(getWorkflow).not.toHaveBeenCalled();
    expect(createWorkflow).toHaveBeenCalledOnce();
    expect(createWorkflow.mock.calls[0][0]).toMatchObject({
      lid: WORKFLOW_LID,
    });
    expect(localStorage.getItem(STORAGE_KEY)).toBe("server-1");
  });

  it("fetches the workflow at the cached id on load", async () => {
    localStorage.setItem(STORAGE_KEY, "server-1");
    getWorkflow.mockResolvedValue(
      makeWorkflow({ id: "server-1", name: "My workflow" })
    );

    const { result } = renderHook(() => useWorkflowPersistence());

    await waitFor(() => expect(result.current.status).toBe("idle"));

    expect(getWorkflow).toHaveBeenCalledWith("server-1");
    expect(createWorkflow).not.toHaveBeenCalled();
  });

  it("falls back to creating a new workflow when the cached id 404s", async () => {
    localStorage.setItem(STORAGE_KEY, "stale-id");
    getWorkflow.mockRejectedValue(notFoundError());
    createWorkflow.mockResolvedValue(makeWorkflow({ id: "server-2" }));

    const { result } = renderHook(() => useWorkflowPersistence());

    await waitFor(() => expect(result.current.status).toBe("idle"));

    expect(createWorkflow).toHaveBeenCalledOnce();
    expect(localStorage.getItem(STORAGE_KEY)).toBe("server-2");
  });

  it("surfaces an error status when loading fails for a non-404 reason", async () => {
    localStorage.setItem(STORAGE_KEY, "server-1");
    getWorkflow.mockRejectedValue(new Error("network down"));

    const { result } = renderHook(() => useWorkflowPersistence());

    await waitFor(() => expect(result.current.status).toBe("error"));

    expect(result.current.error).toBeTruthy();
    expect(createWorkflow).not.toHaveBeenCalled();
  });

  it("saves the current canvas state to the loaded workflow's id", async () => {
    createWorkflow.mockResolvedValue(makeWorkflow({ id: "server-1" }));
    updateWorkflow.mockResolvedValue(makeWorkflow({ id: "server-1" }));

    const { result } = renderHook(() => useWorkflowPersistence());
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
});
