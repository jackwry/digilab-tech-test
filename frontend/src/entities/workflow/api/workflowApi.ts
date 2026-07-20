import { apiClient } from "@/shared/api/client";

import type { Workflow } from "../model/types";

/**
 * Workflow persistence endpoints (brief §C3): create / get / update.
 *
 * The backend wraps every response in a `{ data: ... }` DTO envelope
 * (JAC-12), so each call unwraps `response.data.data` rather than
 * `response.data`.
 */

interface DataEnvelope<T> {
  data: T;
}

interface ListEnvelope<T> {
  data: T[];
  offset: number;
  limit: number;
}

export async function listWorkflows(): Promise<Workflow[]> {
  const { data } = await apiClient.get<ListEnvelope<Workflow>>("/workflows");
  return data.data;
}

export async function createWorkflow(workflow: Workflow): Promise<Workflow> {
  const { data } = await apiClient.post<DataEnvelope<Workflow>>(
    "/workflows",
    workflow
  );
  return data.data;
}

export async function getWorkflow(id: string): Promise<Workflow> {
  const { data } = await apiClient.get<DataEnvelope<Workflow>>(
    `/workflows/${id}`
  );
  return data.data;
}

export async function updateWorkflow(
  id: string,
  workflow: Workflow
): Promise<Workflow> {
  const { data } = await apiClient.put<DataEnvelope<Workflow>>(
    `/workflows/${id}`,
    workflow
  );
  return data.data;
}
