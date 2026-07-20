"""Shared wire-format infrastructure (JAC-12): the camelCase base model and
the DTO envelope pattern every endpoint's response is wrapped in, so the
frontend has one predictable shape to unwrap regardless of which endpoint
it's calling.

Lives at the app root (not inside a domain package) because it's generic
infrastructure any domain module builds on — `app/workflow/models.py`
imports `CamelModel` from here, for example.
"""

from typing import Generic, TypeVar

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel

T = TypeVar("T")


class CamelModel(BaseModel):
    """Base model that serialises to camelCase on the wire.

    The browser client uses camelCase field names, so emitting camelCase keeps a
    single contract across the stack. `populate_by_name=True` means Python code
    can still build models with their snake_case field names.
    """

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class DataResponse(CamelModel, Generic[T]):
    """Envelope for a single item of data: `{ "data": {...} }`."""

    data: T


class ListResponse(CamelModel, Generic[T]):
    """Envelope for paginated/list data: `{ "data": [...], "offset": 0, "limit": 50 }`.

    Not yet wired to an endpoint — there's no list/paginated workflow route in
    this ticket's scope — but included so the pattern is established ahead of
    one (see the decision log).
    """

    data: list[T]
    offset: int
    limit: int


class ErrorDetail(CamelModel):
    """A single coded, human-readable error.

    `extra="allow"`: callers can pass whatever endpoint-specific extra
    fields are useful (e.g. a validation error's `loc`, or a workflow
    diagnostic's `nodeId`/`edgeId`) and they're serialised alongside
    `code`/`message` rather than needing a new field declared here every
    time one comes up.
    """

    model_config = ConfigDict(
        alias_generator=to_camel, populate_by_name=True, extra="allow"
    )

    code: str
    message: str


class ErrorResponse(CamelModel):
    """Envelope for error information: `{ "errors": [{...}] }`."""

    errors: list[ErrorDetail]
