import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";

import {
  createWorkflow,
  flowToWorkflow,
  generateDefaultWorkflowName,
  initialEdges,
  initialNodes,
  listWorkflows,
} from "@/entities/workflow";

const WORKFLOWS_QUERY_KEY = ["workflows"];

function formatUpdatedAt(updatedAt: string | undefined): string | null {
  if (!updatedAt) return null;
  const date = new Date(updatedAt);
  if (Number.isNaN(date.getTime())) return null;
  return `Updated ${date.toLocaleString()}`;
}

/** Homepage (JAC-13): lists the user's workflows, most recently updated
 * first (the order the backend already returns them in), and lets them
 * start a new one seeded with the basic DataSource → Transform → Model
 * starter graph. */
export function WorkflowsHomePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const {
    data: workflows,
    status: queryStatus,
  } = useQuery({
    queryKey: WORKFLOWS_QUERY_KEY,
    queryFn: listWorkflows,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      createWorkflow(
        flowToWorkflow(initialNodes, initialEdges, {
          name: generateDefaultWorkflowName(),
        })
      ),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: WORKFLOWS_QUERY_KEY });
      if (created.id) navigate(`/workflows/${created.id}`);
    },
  });

  return (
    <div className="mx-auto flex h-full w-full max-w-2xl flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-800">Workflows</h1>
        <button
          type="button"
          onClick={() => createMutation.mutate()}
          disabled={createMutation.isPending}
          className="rounded-md bg-slate-800 px-3 py-1.5 text-sm font-medium text-white shadow disabled:cursor-not-allowed disabled:opacity-50"
        >
          {createMutation.isPending ? "Creating…" : "New workflow"}
        </button>
      </div>

      {queryStatus === "pending" && (
        <p className="text-sm text-slate-500">Loading workflows…</p>
      )}

      {queryStatus === "error" && (
        <p className="text-sm text-red-600">Failed to load workflows.</p>
      )}

      {queryStatus === "success" && workflows.length === 0 && (
        <p className="text-sm text-slate-500">
          No workflows yet — create one to get started.
        </p>
      )}

      {queryStatus === "success" && workflows.length > 0 && (
        <ul className="flex flex-col gap-2">
          {workflows.map((workflow) => (
            <li key={workflow.id}>
              <Link
                to={`/workflows/${workflow.id}`}
                className="flex flex-col gap-0.5 rounded-lg border border-slate-200 bg-white p-3 shadow-sm hover:border-slate-300"
              >
                <span className="font-medium text-slate-800">
                  {workflow.name}
                </span>
                {formatUpdatedAt(workflow.updatedAt) && (
                  <span className="text-xs text-slate-500">
                    {formatUpdatedAt(workflow.updatedAt)}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}

      {createMutation.isError && (
        <p className="text-sm text-red-600">Failed to create workflow.</p>
      )}
    </div>
  );
}
