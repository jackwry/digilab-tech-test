"""Domain models for the workflow API.

These mirror the frontend's `src/types/workflow.ts` so both ends speak the same
wire contract. They are a STARTING POINT taken from the exercise brief — the
precise schema is part of the design problem, so change them where you can
justify it, but keep the two sides aligned (see the README note on type
alignment).
"""

from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel

DataType = Literal["Dataset", "Model", "Any"]
NodeType = Literal["DataSource", "Transform", "Model"]


class CamelModel(BaseModel):
    """Base model that serialises to camelCase on the wire.

    The browser client uses camelCase field names, so emitting camelCase keeps a
    single contract across the stack. `populate_by_name=True` means Python code
    can still build models with their snake_case field names.
    """

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class HandleDefinition(CamelModel):
    id: str
    label: str
    type: DataType
    required: bool = False


class Position(CamelModel):
    x: float
    y: float


class WorkflowNodeData(CamelModel):
    label: str
    inputs: list[HandleDefinition] = []
    outputs: list[HandleDefinition] = []


class WorkflowNode(CamelModel):
    id: str
    type: NodeType
    position: Position
    data: WorkflowNodeData


class WorkflowEdge(CamelModel):
    id: str
    source_node_id: str
    source_handle_id: str
    target_node_id: str
    target_handle_id: str


class Workflow(CamelModel):
    id: Optional[str] = None
    name: str
    nodes: list[WorkflowNode] = []
    edges: list[WorkflowEdge] = []


class ValidationIssue(CamelModel):
    """A single coded, path-addressed diagnostic (see brief §C4)."""

    code: str
    message: str
    node_id: Optional[str] = None
    edge_id: Optional[str] = None
    path: Optional[str] = None


class ValidationResult(CamelModel):
    valid: bool
    errors: list[ValidationIssue] = []
    warnings: list[ValidationIssue] = []
