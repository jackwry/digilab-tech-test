"""Unit tests for whole-workflow validation (JAC-16). Covers the rules listed
on the ticket plus the draw-time rules from JAC-10 (self-reference, circular
reference), since a workflow can still reach these states via direct API
calls even though the canvas prevents drawing them."""

from app.workflow.models import (
    HandleDefinition,
    Position,
    Workflow,
    WorkflowEdge,
    WorkflowNode,
    WorkflowNodeData,
)
from app.workflow.validation import validate_workflow


def make_node(
    node_id: str,
    *,
    inputs: list[HandleDefinition] | None = None,
    outputs: list[HandleDefinition] | None = None,
    label: str | None = None,
) -> WorkflowNode:
    return WorkflowNode(
        id=node_id,
        type="Transform",
        position=Position(x=0, y=0),
        data=WorkflowNodeData(
            label=label or node_id,
            inputs=inputs or [],
            outputs=outputs or [],
        ),
    )


def make_edge(
    edge_id: str,
    source_node_id: str,
    source_handle_id: str,
    target_node_id: str,
    target_handle_id: str,
) -> WorkflowEdge:
    return WorkflowEdge(
        id=edge_id,
        source_node_id=source_node_id,
        source_handle_id=source_handle_id,
        target_node_id=target_node_id,
        target_handle_id=target_handle_id,
    )


def dataset_output(handle_id: str = "out") -> HandleDefinition:
    return HandleDefinition(id=handle_id, label="Output", io="output", type="Dataset")


def dataset_input(handle_id: str = "in") -> HandleDefinition:
    return HandleDefinition(id=handle_id, label="Input", io="input", type="Dataset")


def model_input(handle_id: str = "in") -> HandleDefinition:
    return HandleDefinition(id=handle_id, label="Input", io="input", type="Model")


def test_valid_workflow_has_no_issues() -> None:
    source = make_node("n1", outputs=[dataset_output()])
    target = make_node("n2", inputs=[dataset_input()])
    edge = make_edge("e1", "n1", "out", "n2", "in")

    issues = validate_workflow(Workflow(name="demo", nodes=[source, target], edges=[edge]))

    assert issues == []


def test_resolves_a_nodes_own_output_when_it_shares_a_handle_id_with_an_input() -> None:
    """A Transform-shaped node has an input AND an output both id'd
    "dataset" — a naive input-then-output lookup would resolve its own
    output handle to the input one and misreport this as backwards."""
    transform = make_node(
        "transform", inputs=[dataset_input("dataset")], outputs=[dataset_output("dataset")]
    )
    model = make_node("model", inputs=[dataset_input("dataset")])
    edge = make_edge("e1", "transform", "dataset", "model", "dataset")

    issues = validate_workflow(Workflow(name="demo", nodes=[transform, model], edges=[edge]))

    assert issues == []


def test_duplicate_node_ids_are_flagged() -> None:
    workflow = Workflow(
        name="demo", nodes=[make_node("n1"), make_node("n1")], edges=[]
    )

    issues = validate_workflow(workflow)

    assert any(issue.code == "DUPLICATE_NODE_ID" and issue.node_id == "n1" for issue in issues)


def test_duplicate_edge_ids_are_flagged() -> None:
    n1 = make_node("n1", outputs=[dataset_output()])
    n2 = make_node("n2", inputs=[dataset_input()])
    edge = make_edge("e1", "n1", "out", "n2", "in")
    workflow = Workflow(name="demo", nodes=[n1, n2], edges=[edge, edge])

    issues = validate_workflow(workflow)

    assert any(issue.code == "DUPLICATE_EDGE_ID" and issue.edge_id == "e1" for issue in issues)


def test_unknown_node_reference_is_flagged() -> None:
    n1 = make_node("n1", outputs=[dataset_output()])
    edge = make_edge("e1", "n1", "out", "does-not-exist", "in")
    workflow = Workflow(name="demo", nodes=[n1], edges=[edge])

    issues = validate_workflow(workflow)

    assert any(issue.code == "UNKNOWN_NODE_REFERENCE" and issue.edge_id == "e1" for issue in issues)


def test_unknown_handle_reference_is_flagged() -> None:
    n1 = make_node("n1", outputs=[dataset_output()])
    n2 = make_node("n2", inputs=[dataset_input()])
    edge = make_edge("e1", "n1", "out", "n2", "does-not-exist")
    workflow = Workflow(name="demo", nodes=[n1, n2], edges=[edge])

    issues = validate_workflow(workflow)

    assert any(issue.code == "UNKNOWN_HANDLE_REFERENCE" and issue.edge_id == "e1" for issue in issues)


def test_invalid_direction_is_flagged_when_source_is_not_an_output() -> None:
    n1 = make_node("n1", inputs=[dataset_input("a")])
    n2 = make_node("n2", inputs=[dataset_input("b")])
    edge = make_edge("e1", "n1", "a", "n2", "b")
    workflow = Workflow(name="demo", nodes=[n1, n2], edges=[edge])

    issues = validate_workflow(workflow)

    assert any(issue.code == "INVALID_CONNECTION_DIRECTION" and issue.edge_id == "e1" for issue in issues)


def test_invalid_direction_is_flagged_when_target_is_not_an_input() -> None:
    n1 = make_node("n1", outputs=[dataset_output("a")])
    n2 = make_node("n2", outputs=[dataset_output("b")])
    edge = make_edge("e1", "n1", "a", "n2", "b")
    workflow = Workflow(name="demo", nodes=[n1, n2], edges=[edge])

    issues = validate_workflow(workflow)

    assert any(issue.code == "INVALID_CONNECTION_DIRECTION" and issue.edge_id == "e1" for issue in issues)


def test_incompatible_handle_types_are_flagged() -> None:
    n1 = make_node("n1", outputs=[dataset_output()])
    n2 = make_node("n2", inputs=[model_input()])
    edge = make_edge("e1", "n1", "out", "n2", "in")
    workflow = Workflow(name="demo", nodes=[n1, n2], edges=[edge])

    issues = validate_workflow(workflow)

    assert any(issue.code == "INCOMPATIBLE_HANDLE_TYPES" and issue.edge_id == "e1" for issue in issues)


def test_any_typed_input_accepts_any_source_type() -> None:
    n1 = make_node("n1", outputs=[dataset_output()])
    n2 = make_node(
        "n2", inputs=[HandleDefinition(id="in", label="Input", io="input", type="Any")]
    )
    edge = make_edge("e1", "n1", "out", "n2", "in")
    workflow = Workflow(name="demo", nodes=[n1, n2], edges=[edge])

    issues = validate_workflow(workflow)

    assert issues == []


def test_any_typed_output_into_concrete_input_is_incompatible() -> None:
    n1 = make_node(
        "n1", outputs=[HandleDefinition(id="out", label="Output", io="output", type="Any")]
    )
    n2 = make_node("n2", inputs=[model_input()])
    edge = make_edge("e1", "n1", "out", "n2", "in")
    workflow = Workflow(name="demo", nodes=[n1, n2], edges=[edge])

    issues = validate_workflow(workflow)

    assert any(issue.code == "INCOMPATIBLE_HANDLE_TYPES" and issue.edge_id == "e1" for issue in issues)


def test_multiple_incoming_edges_on_one_input_is_flagged() -> None:
    n1 = make_node("n1", outputs=[dataset_output("a"), dataset_output("b")])
    n2 = make_node("n2", inputs=[dataset_input()])
    edge1 = make_edge("e1", "n1", "a", "n2", "in")
    edge2 = make_edge("e2", "n1", "b", "n2", "in")
    workflow = Workflow(name="demo", nodes=[n1, n2], edges=[edge1, edge2])

    issues = validate_workflow(workflow)

    codes = [issue.code for issue in issues]
    assert codes.count("MULTIPLE_INCOMING_EDGES") >= 1
    assert any(issue.edge_id == "e2" for issue in issues if issue.code == "MULTIPLE_INCOMING_EDGES")


def test_an_output_may_fan_out_to_multiple_inputs() -> None:
    n1 = make_node("n1", outputs=[dataset_output()])
    n2 = make_node("n2", inputs=[dataset_input()])
    n3 = make_node("n3", inputs=[dataset_input()])
    edge1 = make_edge("e1", "n1", "out", "n2", "in")
    edge2 = make_edge("e2", "n1", "out", "n3", "in")
    workflow = Workflow(name="demo", nodes=[n1, n2, n3], edges=[edge1, edge2])

    issues = validate_workflow(workflow)

    assert issues == []


def test_self_reference_is_flagged() -> None:
    n1 = make_node("n1", outputs=[dataset_output("a")], inputs=[dataset_input("b")])
    edge = make_edge("e1", "n1", "a", "n1", "b")
    workflow = Workflow(name="demo", nodes=[n1], edges=[edge])

    issues = validate_workflow(workflow)

    assert any(issue.code == "SELF_REFERENCE" and issue.edge_id == "e1" for issue in issues)


def test_direct_circular_reference_is_flagged() -> None:
    n1 = make_node("n1", outputs=[dataset_output("a")], inputs=[dataset_input("b")])
    n2 = make_node("n2", outputs=[dataset_output("c")], inputs=[dataset_input("d")])
    edge1 = make_edge("e1", "n1", "a", "n2", "d")
    edge2 = make_edge("e2", "n2", "c", "n1", "b")
    workflow = Workflow(name="demo", nodes=[n1, n2], edges=[edge1, edge2])

    issues = validate_workflow(workflow)

    assert any(issue.code == "CIRCULAR_REFERENCE" for issue in issues)


def test_indirect_circular_reference_is_flagged() -> None:
    n1 = make_node("n1", outputs=[dataset_output("a")], inputs=[dataset_input("b")])
    n2 = make_node("n2", outputs=[dataset_output("c")], inputs=[dataset_input("d")])
    n3 = make_node("n3", outputs=[dataset_output("e")], inputs=[dataset_input("f")])
    edge1 = make_edge("e1", "n1", "a", "n2", "d")
    edge2 = make_edge("e2", "n2", "c", "n3", "f")
    edge3 = make_edge("e3", "n3", "e", "n1", "b")
    workflow = Workflow(name="demo", nodes=[n1, n2, n3], edges=[edge1, edge2, edge3])

    issues = validate_workflow(workflow)

    assert any(issue.code == "CIRCULAR_REFERENCE" for issue in issues)


def test_a_shortcut_edge_is_not_a_false_positive_cycle() -> None:
    """A -> B -> C plus a direct A -> C is a diamond, not a cycle."""
    n1 = make_node("n1", outputs=[dataset_output("a1"), dataset_output("a2")])
    n2 = make_node(
        "n2", inputs=[dataset_input("b_in")], outputs=[dataset_output("b_out")]
    )
    n3 = make_node("n3", inputs=[dataset_input("c1"), dataset_input("c2")])
    edge1 = make_edge("e1", "n1", "a1", "n2", "b_in")
    edge2 = make_edge("e2", "n2", "b_out", "n3", "c1")
    edge3 = make_edge("e3", "n1", "a2", "n3", "c2")
    workflow = Workflow(name="demo", nodes=[n1, n2, n3], edges=[edge1, edge2, edge3])

    issues = validate_workflow(workflow)

    assert issues == []


def test_message_references_node_and_handle_labels() -> None:
    n1 = make_node("n1", outputs=[dataset_output()], label="Load CSV")
    n2 = make_node("n2", inputs=[model_input()], label="Train model")
    edge = make_edge("e1", "n1", "out", "n2", "in")
    workflow = Workflow(name="demo", nodes=[n1, n2], edges=[edge])

    issues = validate_workflow(workflow)

    issue = next(issue for issue in issues if issue.code == "INCOMPATIBLE_HANDLE_TYPES")
    assert "Load CSV" in issue.message
    assert "Train model" in issue.message
