import type { Connection } from "@xyflow/react";

import type { DataType, HandleDefinition } from "@/entities/workflow";

/**
 * Draw-time connection rules (JAC-10): handle-type compatibility, no
 * self-references, and no circular references. Pure and ReactFlow-agnostic
 * so it can be unit tested without mounting a canvas.
 */

export type ConnectionRejectionReason =
  | "incompatible-type"
  | "self-reference"
  | "circular-reference"
  | "existing-input";

export interface ConnectionValidationResult {
  valid: boolean;
  reason?: ConnectionRejectionReason;
  message?: string;
}

/** The subset of a `FlowNode` this module needs — decoupled from ReactFlow's internal node shape. */
export interface ConnectionValidationNode {
  id: string;
  label: string;
  inputs: HandleDefinition[];
  outputs: HandleDefinition[];
}

/** The subset of a `FlowEdge` this module needs. */
export interface ConnectionValidationEdge {
  source: string;
  sourceHandle?: string | null;
  target: string;
  targetHandle?: string | null;
}

/**
 * Checks whether the source and target handles are oriented correctly for a
 * connection. A valid connection is always from an output handle to an input
 * handle, or vice versa (for bidirectional connections). Connections between
 * two input handles or two output handles are invalid.
 */
export function isDirectional(
  sourceHandle: HandleDefinition,
  targetHandle: HandleDefinition
): boolean {
  return (
    (sourceHandle.io === "output" && targetHandle.io === "input") ||
    (sourceHandle.io === "input" && targetHandle.io === "output")
  );
}

/**
 * Checks if the target handle already has an incoming connection. If so, it
 * cannot accept another one (JAC-10 §C2). Handle ids (e.g. "dataset") are
 * only unique *within* a node, so this must match on the target node's id
 * together with the handle id, not the handle id alone.
 */
export function inputHasExistingOutput(
  targetNodeId: string,
  targetHandle: HandleDefinition,
  edges: ConnectionValidationEdge[]
): boolean {
  return (
    targetHandle.io === "input" &&
    edges.some(
      (edge) =>
        edge.target === targetNodeId && edge.targetHandle === targetHandle.id
    )
  );
}

/**
 * `Any` is a wildcard only on the *input* side: an `Any`-typed input handle
 * accepts any source type, but an `Any`-typed output does not get to connect
 * into an unrelated concrete input (Dataset → Any is valid; Any → Model is
 * not).
 */
export function isTypeCompatible(
  sourceType: DataType,
  targetType: DataType
): boolean {
  return targetType === "Any" || sourceType === targetType;
}

/**
 * A node may reuse the same handle id for both an input and an output (e.g.
 * `Transform`'s `dataset` input and `dataset` output) — searching a flat
 * concatenation of the two lists would silently return whichever comes
 * first, misresolving the other one. `prefer` searches the expected list
 * first (`"output"` for a connection's source handle, `"input"` for its
 * target) so a same-id pair still resolves to the right handle.
 */
function findHandle(
  node: ConnectionValidationNode | undefined,
  handleId: string | null | undefined,
  prefer: "input" | "output"
): HandleDefinition | undefined {
  const ordered =
    prefer === "output"
      ? (node?.outputs ?? []).concat(node?.inputs ?? [])
      : (node?.inputs ?? []).concat(node?.outputs ?? []);
  return ordered.find((handle) => handle.id === handleId);
}

/**
 * Would `source` already be reachable *from* `target` via existing edges?
 * If so, `target` can already loop back around to `source`, so adding
 * `source -> target` would close a cycle. A node that's simply downstream
 * via an independent path — e.g. A -> B -> C, then a new A -> C edge — does
 * not trip this: C has no path back to A, only a path forward from it.
 */
function wouldCreateCycle(
  source: string,
  target: string,
  edges: ConnectionValidationEdge[]
): boolean {
  const visited = new Set<string>();
  const stack = [target];

  while (stack.length > 0) {
    const current = stack.pop()!;
    if (current === source) return true;
    if (visited.has(current)) continue;
    visited.add(current);

    for (const edge of edges) {
      if (edge.source === current) stack.push(edge.target);
    }
  }

  return false;
}

export function validateConnection(
  connection: Connection,
  nodes: ConnectionValidationNode[],
  edges: ConnectionValidationEdge[]
): ConnectionValidationResult {
  const {
    source,
    sourceHandle: sourceHandleId,
    target,
    targetHandle: targetHandleId,
  } = connection;

  const sourceNode = nodes.find((node) => node.id === source);
  const targetNode = nodes.find((node) => node.id === target);
  const sourceHandle = findHandle(sourceNode, sourceHandleId, "output");
  const targetHandle = findHandle(targetNode, targetHandleId, "input");

  if (!sourceNode || !targetNode) {
    return {
      valid: false,
      reason: "incompatible-type",
      message: `Cannot connect ${sourceNode?.label ?? "an unknown node"} to ${targetNode?.label ?? "an unknown node"} — one or both nodes do not exist.`,
    };
  }

  if (!sourceHandle || !targetHandle) {
    return {
      valid: false,
      reason: "incompatible-type",
      message: `Cannot connect ${sourceHandle?.label ?? "an unknown handle"} to ${targetHandle?.label ?? "an unknown handle"} — one or both handles do not exist.`,
    };
  }

  if (inputHasExistingOutput(target, targetHandle, edges)) {
    return {
      valid: false,
      reason: "existing-input",
      message: `Cannot connect ${sourceHandle.label} to ${targetHandle.label} — inputs can only have one output connected to them.`,
    };
  }

  if (!isTypeCompatible(sourceHandle.type, targetHandle.type)) {
    return {
      valid: false,
      reason: "incompatible-type",
      message: `Cannot connect ${sourceHandle.label} to ${targetHandle.label} — types are incompatible.`,
    };
  }

  if (source === target) {
    return {
      valid: false,
      reason: "self-reference",
      message: `Cannot connect ${sourceNode.label} to itself.`,
    };
  }

  if (wouldCreateCycle(source, target, edges)) {
    return {
      valid: false,
      reason: "circular-reference",
      message: `Cannot connect ${sourceNode.label} to ${targetNode.label} — this connection would create a circular reference.`,
    };
  }

  return { valid: true };
}
