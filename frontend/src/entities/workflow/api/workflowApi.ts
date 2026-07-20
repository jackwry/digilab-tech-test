import { apiClient } from "@/shared/api/client";

import type { Workflow } from "../model/types";

/**
 * Workflow persistence endpoints (brief §C3): create / get / update.
 *
 * These sketch the intended shape — adapt them (and the backend) to whatever
 * contract you design. Error handling, loading/failure states, validation
 * calls, and how the UI consumes all of this are yours to build (see §C4–C5).
 */
export async function createWorkflow(workflow: Workflow): Promise<Workflow> {
  const { data } = await apiClient.post<Workflow>("/workflows", workflow);
  return data;
}

export async function getWorkflow(id: string): Promise<Workflow> {
  const { data } = await apiClient.get<Workflow>(`/workflows/${id}`);
  return data;
}

export async function updateWorkflow(
  id: string,
  workflow: Workflow
): Promise<Workflow> {
  const { data } = await apiClient.put<Workflow>(`/workflows/${id}`, workflow);
  return data;
}
