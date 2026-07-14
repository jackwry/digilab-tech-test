import axios from "axios";

import type { Workflow } from "@/types/workflow";

/**
 * Thin API client. The base URL comes from `VITE_API_BASE_URL` (see
 * `.env.example`) and defaults to the local backend.
 *
 * The functions below sketch the endpoints from brief §C3 to show the intended
 * shape — adapt them (and the backend) to whatever contract you design. Error
 * handling, loading/failure states, validation calls, and how the UI consumes
 * all of this are yours to build (see §C4–C5).
 */
const baseURL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

export const api = axios.create({ baseURL });

export async function createWorkflow(workflow: Workflow): Promise<Workflow> {
  const { data } = await api.post<Workflow>("/workflows", workflow);
  return data;
}

export async function getWorkflow(id: string): Promise<Workflow> {
  const { data } = await api.get<Workflow>(`/workflows/${id}`);
  return data;
}

export async function updateWorkflow(
  id: string,
  workflow: Workflow
): Promise<Workflow> {
  const { data } = await api.put<Workflow>(`/workflows/${id}`, workflow);
  return data;
}
