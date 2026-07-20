/**
 * The domain contract for a workflow — the shape the API persists, and the
 * concept shared (conceptually) with the backend's `app/models.py`.
 *
 * This is a STARTING POINT taken from the exercise brief. The precise schema is
 * part of the design problem: change it if you can justify the change, but keep
 * the frontend and backend in step (see the README note on type alignment).
 *
 * Note: this is intentionally independent of ReactFlow's own Node/Edge types.
 * ReactFlow-specific shapes live in `entities/workflow/model/flowTypes.ts`, and
 * mapping between the two is part of the exercise.
 */

export type DataType = "Dataset" | "Model" | "Any";

export type NodeType = "DataSource" | "Transform" | "Model";

export interface HandleDefinition {
  id: string;
  label: string;
  type: DataType;
  required?: boolean;
}

export interface WorkflowNode {
  id: string;
  type: NodeType;
  position: { x: number; y: number };
  data: {
    label: string;
    inputs: HandleDefinition[];
    outputs: HandleDefinition[];
  };
}

export interface WorkflowEdge {
  id: string;
  sourceNodeId: string;
  sourceHandleId: string;
  targetNodeId: string;
  targetHandleId: string;
}

export interface Workflow {
  id?: string;
  /** Client-generated local id, distinct from the server-assigned `id` — see `workflowApi.ts`. */
  lid?: string;
  name: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

/** A single coded, path-addressed diagnostic (see brief §C4). */
export interface ValidationIssue {
  code: string;
  message: string;
  nodeId?: string;
  edgeId?: string;
  path?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}
