import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getWorkflow } = vi.hoisted(() => ({
  getWorkflow: vi.fn(),
}));

vi.mock("@/entities/workflow", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/entities/workflow")>();
  return { ...actual, getWorkflow };
});

import { useWorkflowStore } from "@/entities/workflow";

import { WorkflowEditorPage } from "../WorkflowEditorPage";

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/workflows/server-1"]}>
      <Routes>
        <Route path="/" element={<div>Workflows home</div>} />
        <Route
          path="/workflows/:workflowId"
          element={<WorkflowEditorPage />}
        />
      </Routes>
    </MemoryRouter>
  );
}

function notFoundError(): Error {
  return Object.assign(new Error("not found"), {
    isAxiosError: true,
    response: { status: 404 },
  });
}

beforeEach(() => {
  getWorkflow.mockReset();
  useWorkflowStore.setState({ nodes: [], edges: [] });
});

describe("WorkflowEditorPage", () => {
  it("shows a not-found message when the workflow id doesn't exist", async () => {
    getWorkflow.mockRejectedValue(notFoundError());

    renderPage();

    expect(
      await screen.findByText("This workflow no longer exists.")
    ).toBeInTheDocument();
  });

  it("shows a distinct load-error message when the workflow fails to load for another reason, without any broken save-button state", async () => {
    getWorkflow.mockRejectedValue(new Error("network down"));

    renderPage();

    expect(
      await screen.findByText("Something went wrong loading this workflow.")
    ).toBeInTheDocument();
    expect(screen.queryByText("Save")).not.toBeInTheDocument();
    expect(screen.queryByText("Saved")).not.toBeInTheDocument();
    expect(screen.queryByText("Failed to save")).not.toBeInTheDocument();
  });
});
