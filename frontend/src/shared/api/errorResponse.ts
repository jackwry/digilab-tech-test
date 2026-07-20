import axios from "axios";

/**
 * Mirrors the backend's `ErrorResponse`/`ErrorDetail` DTOs (`app/dto.py`):
 * every rejected request — including FastAPI/Pydantic's automatic 422s and
 * whole-workflow validation failures (JAC-16) — comes back as
 * `{ errors: [{ code, message, ... }] }`.
 */
export interface ApiErrorDetail {
  code: string;
  message: string;
}

interface ApiErrorResponse {
  errors: ApiErrorDetail[];
}

function isApiErrorResponse(body: unknown): body is ApiErrorResponse {
  return (
    typeof body === "object" &&
    body !== null &&
    Array.isArray((body as { errors?: unknown }).errors)
  );
}

/** Extracts the structured error list from a failed request, or `[]` if the
 * failure didn't come back in the expected DTO shape (e.g. a network error
 * with no response body at all). */
export function extractApiErrors(err: unknown): ApiErrorDetail[] {
  if (!axios.isAxiosError(err)) return [];
  const body: unknown = err.response?.data;
  return isApiErrorResponse(body) ? body.errors : [];
}
