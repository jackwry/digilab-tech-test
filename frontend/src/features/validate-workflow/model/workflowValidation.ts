import type {
  HandleDefinition,
  ValidationIssue,
  WorkflowEdge,
  WorkflowNode,
} from "@/entities/workflow";

/**
 * Whole-workflow validation (JAC-16). Mirrors the backend's
 * `app/workflow/validation.py` rule-for-rule (including the JAC-10 draw-time
 * rules — self-reference, circular reference — since this runs over the
 * whole graph, not just a candidate edge) so a workflow is rejected
 * client-side before it's ever posted, and the backend's re-check of the
 * same rules is redundant in the common case rather than the only line of
 * defense.
 */

/**
 * A node may reuse the same handle id for both an input and an output (e.g.
 * `Transform`'s `dataset` input and `dataset` output) — searching a flat
 * concatenation of the two lists would silently return whichever comes
 * first, misreporting direction for the other. `prefer` searches the
 * expected list first (`"output"` for an edge's source handle, `"input"`
 * for its target) so a same-id pair still resolves to the right one; only a
 * handle that truly doesn't exist in either list falls through.
 */
function findHandle(
  node: WorkflowNode,
  handleId: string,
  prefer: "input" | "output"
): HandleDefinition | undefined {
  const ordered =
    prefer === "output"
      ? [...node.data.outputs, ...node.data.inputs]
      : [...node.data.inputs, ...node.data.outputs];
  return ordered.find((handle) => handle.id === handleId);
}

function isTypeCompatible(sourceType: string, targetType: string): boolean {
  return targetType === "Any" || sourceType === targetType;
}

/**
 * Which edges lie on a cycle, anywhere in the graph?
 *
 * This checks the whole graph at once — not "would adding this edge create
 * a cycle", which only makes sense when building a graph up one edge at a
 * time. Here we already have the complete, structurally-valid edge set for
 * the whole workflow, so a single DFS back-edge detection over all of it
 * finds every cycle regardless of what order the edges happen to appear in.
 */
function findCyclicEdges(
  edges: { edgeId: string; sourceNodeId: string; targetNodeId: string }[]
): Set<string> {
  const edgesBySource = new Map<string, { targetId: string; edgeId: string }[]>();
  for (const { edgeId, sourceNodeId, targetNodeId } of edges) {
    edgesBySource.set(sourceNodeId, [
      ...(edgesBySource.get(sourceNodeId) ?? []),
      { targetId: targetNodeId, edgeId },
    ]);
  }

  const onStack = new Set<string>();
  const visited = new Set<string>();
  const cyclicEdgeIds = new Set<string>();

  function visit(nodeId: string): void {
    onStack.add(nodeId);
    for (const { targetId, edgeId } of edgesBySource.get(nodeId) ?? []) {
      if (onStack.has(targetId)) {
        cyclicEdgeIds.add(edgeId);
      } else if (!visited.has(targetId)) {
        visit(targetId);
      }
    }
    onStack.delete(nodeId);
    visited.add(nodeId);
  }

  for (const nodeId of edgesBySource.keys()) {
    if (!visited.has(nodeId)) visit(nodeId);
  }

  return cyclicEdgeIds;
}

export function validateWorkflow(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[]
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  const nodesById = new Map<string, WorkflowNode>();
  for (const node of nodes) {
    if (nodesById.has(node.id)) {
      issues.push({
        code: "DUPLICATE_NODE_ID",
        message: `Node id '${node.id}' is used by more than one node.`,
        nodeId: node.id,
      });
    } else {
      nodesById.set(node.id, node);
    }
  }

  const seenEdgeIds = new Set<string>();
  const incomingByInput = new Map<string, string[]>();
  const graphEdges: {
    edgeId: string;
    sourceNodeId: string;
    targetNodeId: string;
  }[] = [];
  const edgeEndpoints = new Map<string, [WorkflowNode, WorkflowNode]>();

  for (const edge of edges) {
    if (seenEdgeIds.has(edge.id)) {
      issues.push({
        code: "DUPLICATE_EDGE_ID",
        message: `Edge id '${edge.id}' is used by more than one edge.`,
        edgeId: edge.id,
      });
      continue;
    }
    seenEdgeIds.add(edge.id);

    const sourceNode = nodesById.get(edge.sourceNodeId);
    const targetNode = nodesById.get(edge.targetNodeId);
    if (!sourceNode || !targetNode) {
      const missing = !sourceNode ? edge.sourceNodeId : edge.targetNodeId;
      issues.push({
        code: "UNKNOWN_NODE_REFERENCE",
        message: `Edge '${edge.id}' references node '${missing}', which does not exist.`,
        edgeId: edge.id,
      });
      continue;
    }

    const sourceHandle = findHandle(sourceNode, edge.sourceHandleId, "output");
    const targetHandle = findHandle(targetNode, edge.targetHandleId, "input");
    if (!sourceHandle || !targetHandle) {
      const [nodeLabel, handleId] = !sourceHandle
        ? [sourceNode.data.label, edge.sourceHandleId]
        : [targetNode.data.label, edge.targetHandleId];
      issues.push({
        code: "UNKNOWN_HANDLE_REFERENCE",
        message: `Edge '${edge.id}' references handle '${handleId}' on '${nodeLabel}', which does not exist.`,
        edgeId: edge.id,
      });
      continue;
    }

    if (sourceHandle.io !== "output" || targetHandle.io !== "input") {
      issues.push({
        code: "INVALID_CONNECTION_DIRECTION",
        message: `Cannot connect ${sourceNode.data.label}.${sourceHandle.label} to ${targetNode.data.label}.${targetHandle.label} — a connection must start at an output handle and end at an input handle.`,
        edgeId: edge.id,
      });
      continue;
    }

    if (edge.sourceNodeId === edge.targetNodeId) {
      issues.push({
        code: "SELF_REFERENCE",
        message: `'${sourceNode.data.label}' cannot be connected to itself.`,
        edgeId: edge.id,
      });
      continue;
    }

    if (!isTypeCompatible(sourceHandle.type, targetHandle.type)) {
      issues.push({
        code: "INCOMPATIBLE_HANDLE_TYPES",
        message: `Cannot connect ${sourceNode.data.label}.${sourceHandle.label} to ${targetNode.data.label}.${targetHandle.label} — types are incompatible.`,
        edgeId: edge.id,
      });
    }

    const inputKey = `${edge.targetNodeId}::${edge.targetHandleId}`;
    incomingByInput.set(inputKey, [
      ...(incomingByInput.get(inputKey) ?? []),
      edge.id,
    ]);

    graphEdges.push({
      edgeId: edge.id,
      sourceNodeId: edge.sourceNodeId,
      targetNodeId: edge.targetNodeId,
    });
    edgeEndpoints.set(edge.id, [sourceNode, targetNode]);
  }

  for (const edgeId of findCyclicEdges(graphEdges)) {
    const [sourceNode, targetNode] = edgeEndpoints.get(edgeId)!;
    issues.push({
      code: "CIRCULAR_REFERENCE",
      message: `Connecting ${sourceNode.data.label} to ${targetNode.data.label} is part of a circular reference.`,
      edgeId,
    });
  }

  for (const [inputKey, edgeIds] of incomingByInput) {
    if (edgeIds.length <= 1) continue;

    const [targetNodeId, targetHandleId] = inputKey.split("::");
    const targetNode = nodesById.get(targetNodeId)!;
    const targetHandle = findHandle(targetNode, targetHandleId, "input");
    const handleLabel = targetHandle?.label ?? targetHandleId;

    for (const edgeId of edgeIds.slice(1)) {
      issues.push({
        code: "MULTIPLE_INCOMING_EDGES",
        message: `'${targetNode.data.label}.${handleLabel}' already has an incoming connection — an input can only have one.`,
        edgeId,
      });
    }
  }

  return issues;
}
