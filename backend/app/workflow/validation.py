"""Whole-workflow validation (JAC-16).

Covers the rules listed on the ticket (unknown node/handle references,
invalid direction, incompatible handle types, duplicate node/edge ids, and
more than one incoming edge per input) plus the draw-time rules from JAC-10
(self-reference, circular reference) — the canvas prevents drawing these, but
a workflow can still reach these states via a direct API call, so the backend
re-checks them independently rather than trusting the client.

The frontend already runs these same rules before ever posting, so the
backend isn't expected to see a workflow that fails them. If it does, that's
treated as a hard error (see `router.py`): the request is rejected and
nothing is saved, rather than persisting a workflow that violates its own
basic rules.
"""

from app.workflow.models import HandleDefinition, ValidationIssue, Workflow, WorkflowNode


class WorkflowValidationError(Exception):
    """Raised when a workflow fails whole-workflow validation. Carries the
    full list of issues so the caller can report all of them, not just the
    first one."""

    def __init__(self, issues: list[ValidationIssue]) -> None:
        self.issues = issues
        super().__init__("Workflow failed validation.")


def _find_handle(
    node: WorkflowNode, handle_id: str, prefer: str
) -> HandleDefinition | None:
    """A node may reuse the same handle id for both an input and an output
    (e.g. `Transform`'s `dataset` input and `dataset` output) — searching a
    flat concatenation of the two lists would silently return whichever
    comes first, misreporting direction for the other. `prefer` searches the
    expected list first (`"output"` for an edge's source handle, `"input"`
    for its target) so a same-id pair still resolves to the right one; only
    a handle that truly doesn't exist in either list falls through.
    """
    ordered = (
        (node.data.outputs, node.data.inputs)
        if prefer == "output"
        else (node.data.inputs, node.data.outputs)
    )
    for group in ordered:
        for handle in group:
            if handle.id == handle_id:
                return handle
    return None


def _is_type_compatible(source_type: str, target_type: str) -> bool:
    """`Any` is a wildcard only on the input side (JAC-10)."""
    return target_type == "Any" or source_type == target_type


def _describe_node(node: WorkflowNode) -> str:
    """A node's label alone isn't enough to unambiguously find it in the
    workflow (labels aren't required to be unique) — pairing it with the id
    makes every message traceable back to the exact node, while still
    reading naturally for a human."""
    return f"'{node.data.label}' (id '{node.id}')"


def _describe_handle(handle: HandleDefinition) -> str:
    return f"'{handle.label}' (id '{handle.id}')"


def _find_cyclic_edges(edges: list[tuple[str, str, str]]) -> set[str]:
    """Which edges lie on a cycle, anywhere in the graph?

    This checks the whole graph at once — not "would adding this edge
    create a cycle", which only makes sense when building a graph up one
    edge at a time. Here we already have the complete, structurally-valid
    edge set for the whole workflow, so a single DFS back-edge detection
    over all of it finds every cycle regardless of what order the edges
    happen to appear in.

    `edges` is `(edge_id, source_node_id, target_node_id)`.
    """
    edges_by_source: dict[str, list[tuple[str, str]]] = {}
    for edge_id, source_id, target_id in edges:
        edges_by_source.setdefault(source_id, []).append((target_id, edge_id))

    on_stack: set[str] = set()
    visited: set[str] = set()
    cyclic_edge_ids: set[str] = set()

    def visit(node_id: str) -> None:
        on_stack.add(node_id)
        for target_id, edge_id in edges_by_source.get(node_id, []):
            if target_id in on_stack:
                cyclic_edge_ids.add(edge_id)
            elif target_id not in visited:
                visit(target_id)
        on_stack.discard(node_id)
        visited.add(node_id)

    for node_id in edges_by_source:
        if node_id not in visited:
            visit(node_id)

    return cyclic_edge_ids


def validate_workflow(workflow: Workflow) -> list[ValidationIssue]:
    issues: list[ValidationIssue] = []

    nodes_by_id: dict[str, WorkflowNode] = {}
    for node in workflow.nodes:
        if node.id in nodes_by_id:
            issues.append(
                ValidationIssue(
                    code="DUPLICATE_NODE_ID",
                    message=f"Node {_describe_node(node)} is used by more than one node.",
                    node_id=node.id,
                )
            )
        else:
            nodes_by_id[node.id] = node

    seen_edge_ids: set[str] = set()
    incoming_edges_by_input: dict[tuple[str, str], list[str]] = {}
    graph_edges: list[tuple[str, str, str]] = []
    edge_endpoints: dict[str, tuple[WorkflowNode, WorkflowNode]] = {}

    for edge in workflow.edges:
        if edge.id in seen_edge_ids:
            source_node = nodes_by_id.get(edge.source_node_id)
            target_node = nodes_by_id.get(edge.target_node_id)
            connecting = (
                f" (connecting {_describe_node(source_node)} to {_describe_node(target_node)})"
                if source_node is not None and target_node is not None
                else ""
            )
            issues.append(
                ValidationIssue(
                    code="DUPLICATE_EDGE_ID",
                    message=f"Edge id '{edge.id}'{connecting} is used by more than one edge.",
                    edge_id=edge.id,
                )
            )
            continue
        seen_edge_ids.add(edge.id)

        source_node = nodes_by_id.get(edge.source_node_id)
        target_node = nodes_by_id.get(edge.target_node_id)
        if source_node is None or target_node is None:
            known_node, missing_id = (
                (target_node, edge.source_node_id)
                if source_node is None
                else (source_node, edge.target_node_id)
            )
            known = f" (from {_describe_node(known_node)})" if known_node else ""
            issues.append(
                ValidationIssue(
                    code="UNKNOWN_NODE_REFERENCE",
                    message=(
                        f"Edge '{edge.id}'{known} references node id '{missing_id}', "
                        "which does not exist."
                    ),
                    edge_id=edge.id,
                )
            )
            continue

        source_handle = _find_handle(source_node, edge.source_handle_id, "output")
        target_handle = _find_handle(target_node, edge.target_handle_id, "input")
        if source_handle is None or target_handle is None:
            known_node, missing_handle_id = (
                (source_node, edge.source_handle_id)
                if source_handle is None
                else (target_node, edge.target_handle_id)
            )
            issues.append(
                ValidationIssue(
                    code="UNKNOWN_HANDLE_REFERENCE",
                    message=(
                        f"Edge '{edge.id}' references handle id '{missing_handle_id}' on "
                        f"{_describe_node(known_node)}, which does not exist."
                    ),
                    edge_id=edge.id,
                )
            )
            continue

        if source_handle.io != "output" or target_handle.io != "input":
            issues.append(
                ValidationIssue(
                    code="INVALID_CONNECTION_DIRECTION",
                    message=(
                        f"Cannot connect {_describe_node(source_node)}.{_describe_handle(source_handle)} to "
                        f"{_describe_node(target_node)}.{_describe_handle(target_handle)} — a connection "
                        "must start at an output handle and end at an input handle."
                    ),
                    edge_id=edge.id,
                )
            )
            continue

        if edge.source_node_id == edge.target_node_id:
            issues.append(
                ValidationIssue(
                    code="SELF_REFERENCE",
                    message=f"{_describe_node(source_node)} cannot be connected to itself.",
                    edge_id=edge.id,
                )
            )
            continue

        if not _is_type_compatible(source_handle.type, target_handle.type):
            issues.append(
                ValidationIssue(
                    code="INCOMPATIBLE_HANDLE_TYPES",
                    message=(
                        f"Cannot connect {_describe_node(source_node)}.{_describe_handle(source_handle)} to "
                        f"{_describe_node(target_node)}.{_describe_handle(target_handle)} — types are incompatible."
                    ),
                    edge_id=edge.id,
                )
            )

        input_key = (edge.target_node_id, edge.target_handle_id)
        incoming_edges_by_input.setdefault(input_key, []).append(edge.id)

        graph_edges.append((edge.id, edge.source_node_id, edge.target_node_id))
        edge_endpoints[edge.id] = (source_node, target_node)

    for edge_id in _find_cyclic_edges(graph_edges):
        source_node, target_node = edge_endpoints[edge_id]
        issues.append(
            ValidationIssue(
                code="CIRCULAR_REFERENCE",
                message=(
                    f"Connecting {_describe_node(source_node)} to {_describe_node(target_node)} "
                    "is part of a circular reference."
                ),
                edge_id=edge_id,
            )
        )

    for (target_node_id, target_handle_id), edge_ids in incoming_edges_by_input.items():
        if len(edge_ids) <= 1:
            continue
        target_node = nodes_by_id[target_node_id]
        target_handle = _find_handle(target_node, target_handle_id, "input")
        handle_desc = (
            _describe_handle(target_handle) if target_handle else f"id '{target_handle_id}'"
        )
        for edge_id in edge_ids[1:]:
            issues.append(
                ValidationIssue(
                    code="MULTIPLE_INCOMING_EDGES",
                    message=(
                        f"{_describe_node(target_node)}.{handle_desc} already has an incoming "
                        "connection — an input can only have one."
                    ),
                    edge_id=edge_id,
                )
            )

    return issues
