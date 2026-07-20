import type { Connection } from "@xyflow/react";

import type { DataType, HandleDefinition } from "@/entities/workflow";

/**
 * Draw-time connection rules (JAC-10): handle-type compatibility, no
 * self-references, and no circular references. Pure and ReactFlow-agnostic
 * so it can be unit tested without mounting a canvas.
 */

export type ConnectionRejectionReason =
  "incompatible-type" | "self-reference" | "circular-reference";

export interface ConnectionValidationResult {
  valid: boolean;
  reason?: ConnectionRejectionReason;
  message?: string;
}

/** The subset of a `FlowNode` this module needs — decoupled from ReactFlow's internal node shape. */
export interface ConnectionValidationNode {
  id: string;
  inputs: HandleDefinition[];
  outputs: HandleDefinition[];
}

/** The subset of a `FlowEdge` this module needs. */
export interface ConnectionValidationEdge {
  source: string;
  target: string;
}

export function isTypeCompatible(a: DataType, b: DataType): boolean {
  return a === "Any" || b === "Any" || a === b;
}

function findHandle(
  node: ConnectionValidationNode | undefined,
  handleId: string | null | undefined,
  handles: "inputs" | "outputs"
): HandleDefinition | undefined {
  return node?.[handles].find((handle) => handle.id === handleId);
}

/** Would `target` already be reachable from `source` via existing edges? If so, adding `source -> target` closes a cycle. */
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
  const { source, sourceHandle, target, targetHandle } = connection;

  const sourceNode = nodes.find((node) => node.id === source);
  const targetNode = nodes.find((node) => node.id === target);
  const sourceType = findHandle(sourceNode, sourceHandle, "outputs")?.type;
  const targetType = findHandle(targetNode, targetHandle, "inputs")?.type;

  if (!sourceType || !targetType || !isTypeCompatible(sourceType, targetType)) {
    return {
      valid: false,
      reason: "incompatible-type",
      message: `Cannot connect ${sourceType ?? "an unknown handle"} to ${targetType ?? "an unknown handle"} — types are incompatible.`,
    };
  }

  if (source === target) {
    return {
      valid: false,
      reason: "self-reference",
      message: "A node cannot connect to itself.",
    };
  }

  if (wouldCreateCycle(source, target, edges)) {
    return {
      valid: false,
      reason: "circular-reference",
      message: "This connection would create a circular reference.",
    };
  }

  return { valid: true };
}
