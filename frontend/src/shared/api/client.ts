import axios from "axios";

/**
 * Shared axios instance. The base URL comes from `VITE_API_BASE_URL` (see
 * `.env.example`) and defaults to the local backend. Entity-level API modules
 * (e.g. `entities/workflow/api`) build their endpoint calls on top of this.
 */
const baseURL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

export const apiClient = axios.create({ baseURL });
