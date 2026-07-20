import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Workflow } from "@/entities/workflow";

const { listWorkflows, createWorkflow } = vi.hoisted(() => ({
  listWorkflows: vi.fn(),
  createWorkflow: vi.fn(),
}));

vi.mock("@/entities/workflow", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/entities/workflow")>();
  return { ...actual, listWorkflows, createWorkflow };
});

import { WorkflowsHomePage } from "../WorkflowsHomePage";

function makeWorkflow(overrides: Partial<Workflow> = {}): Workflow {
  return {
    id: "wf-1",
    name: "Workflow ABCD",
    nodes: [],
    edges: [],
    updatedAt: "2026-07-20T00:00:00Z",
    ...overrides,
  };
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route path="/" element={<WorkflowsHomePage />} />
          <Route path="/workflows/:workflowId" element={<div>Editor</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  listWorkflows.mockReset();
  createWorkflow.mockReset();
});

describe("WorkflowsHomePage", () => {
  it("lists workflows ordered as returned by the API", async () => {
    listWorkflows.mockResolvedValue([
      makeWorkflow({ id: "wf-1", name: "First" }),
      makeWorkflow({ id: "wf-2", name: "Second" }),
    ]);

    renderPage();

    const items = await screen.findAllByRole("link", { name: /First|Second/ });
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent("First");
    expect(items[1]).toHaveTextContent("Second");
  });

  it("links each workflow to its editor route", async () => {
    listWorkflows.mockResolvedValue([makeWorkflow({ id: "wf-1", name: "First" })]);

    renderPage();

    const link = await screen.findByRole("link", { name: /First/ });
    expect(link).toHaveAttribute("href", "/workflows/wf-1");
  });

  it("shows an empty state when there are no workflows", async () => {
    listWorkflows.mockResolvedValue([]);

    renderPage();

    expect(
      await screen.findByText(/no workflows yet/i)
    ).toBeInTheDocument();
  });

  it("shows an error state when the list fails to load", async () => {
    listWorkflows.mockRejectedValue(new Error("network down"));

    renderPage();

    expect(
      await screen.findByText(/failed to load workflows/i)
    ).toBeInTheDocument();
  });

  it("creates a new workflow and navigates to its editor on click", async () => {
    const user = userEvent.setup();
    listWorkflows.mockResolvedValue([]);
    createWorkflow.mockResolvedValue(makeWorkflow({ id: "new-id" }));

    renderPage();
    await screen.findByText(/no workflows yet/i);

    await user.click(screen.getByRole("button", { name: /new workflow/i }));

    await waitFor(() => expect(createWorkflow).toHaveBeenCalledOnce());
    expect(await screen.findByText("Editor")).toBeInTheDocument();
  });
});
