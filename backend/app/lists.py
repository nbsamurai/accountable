"""Search, sorting with empty values last, and paging, for every table (spec 4.3)."""

from dataclasses import dataclass
from typing import Annotated, Any, Literal

from fastapi import Query
from sqlalchemy import ColumnElement, Connection, Select, asc, desc, func, nulls_last, or_, select

PAGE_SIZE = 50

Direction = Literal["asc", "desc"]


@dataclass(frozen=True)
class Sortable:
    """A column a table can sort by. Text sorts ignore case."""

    expression: ColumnElement[Any]
    text: bool = False


@dataclass(frozen=True)
class Paging:
    page: int
    page_size: int

    @property
    def offset(self) -> int:
        return (self.page - 1) * self.page_size


def paging(
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=200)] = PAGE_SIZE,
) -> Paging:
    return Paging(page, page_size)


def search(q: str | None, columns: list[ColumnElement[Any]]) -> ColumnElement[bool] | None:
    """Matches any part of any of the columns, ignoring case.

    SQLite's LIKE ignores case for A to Z. `autoescape` makes % and _ match themselves.
    """
    term = (q or "").strip()
    if not term:
        return None
    return or_(*(column.contains(term, autoescape=True) for column in columns))


def order(sortable: Sortable, direction: Direction, tiebreak: ColumnElement[Any]) -> list[Any]:
    """Sorts by one column, with empty values last in both directions, then by `tiebreak`."""
    expression = sortable.expression.collate("NOCASE") if sortable.text else sortable.expression
    by = asc if direction == "asc" else desc
    return [nulls_last(by(expression)), by(tiebreak)]


def page_of(conn: Connection, stmt: Select, ordering: list[Any], page: Paging) -> tuple[list, int]:
    """One page of rows, and the number of rows that match in all."""
    total = conn.execute(select(func.count()).select_from(stmt.order_by(None).subquery())).scalar_one()
    rows = conn.execute(stmt.order_by(*ordering).offset(page.offset).limit(page.page_size)).all()
    return rows, total
