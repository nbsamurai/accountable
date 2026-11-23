"""Search, sorting with empty values last, and paging, for every table (spec 4.3).

Searches and text sorts fold case with `fold`, which gives the same results on SQLite
and on Postgres. It's the only place that writes SQL for one database.
"""

import string
from collections.abc import Sequence
from dataclasses import dataclass
from typing import Annotated, Any, Literal

from fastapi import Query
from sqlalchemy import (
    ColumnElement,
    Connection,
    Row,
    Select,
    String,
    asc,
    desc,
    func,
    nulls_last,
    or_,
    select,
)
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.sql.functions import FunctionElement

PAGE_SIZE = 50

_ASCII_LOWER = str.maketrans(string.ascii_uppercase, string.ascii_lowercase)


class Fold(FunctionElement):
    """A text column in lower case, folding only A to Z."""

    type = String()
    inherit_cache = True
    name = "fold"


@compiles(Fold)
def _fold_sqlite(element: Fold, compiler, **kw) -> str:
    # SQLite's lower() folds only A to Z, and its comparisons go by bytes, as NOCASE did.
    return f"lower({compiler.process(element.clauses, **kw)})"


@compiles(Fold, "postgresql")
def _fold_postgres(element: Fold, compiler, **kw) -> str:
    # The "C" collation folds only A to Z, and sorts by bytes, as SQLite does.
    return f'lower({compiler.process(element.clauses, **kw)} COLLATE "C")'


def fold(column: ColumnElement[Any]) -> Fold:
    """The case fold for searches and text sorts, the same on SQLite and Postgres."""
    return Fold(column)


def fold_text(text: str) -> str:
    """Folds a search term the way `fold` folds a column: only A to Z, so "ÉMILE" stays "Émile"."""
    return text.translate(_ASCII_LOWER)


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


def search(
    q: str | None, columns: list[ColumnElement[Any]]
) -> ColumnElement[bool] | None:
    """Matches any part of any of the columns, ignoring case for A to Z.

    `autoescape` makes % and _ match themselves.
    """
    term = fold_text((q or "").strip())
    if not term:
        return None
    return or_(*(fold(column).contains(term, autoescape=True) for column in columns))


def order(
    sortable: Sortable, direction: Direction, tiebreak: ColumnElement[Any]
) -> list[Any]:
    """Sorts by one column, with empty values last in both directions, then by `tiebreak`."""
    expression = fold(sortable.expression) if sortable.text else sortable.expression
    by = asc if direction == "asc" else desc
    return [nulls_last(by(expression)), by(tiebreak)]


def page_of(
    conn: Connection, stmt: Select, ordering: list[Any], page: Paging
) -> tuple[Sequence[Row], int]:
    """One page of rows, and the number of rows that match in all."""
    total = conn.execute(
        select(func.count()).select_from(stmt.order_by(None).subquery())
    ).scalar_one()
    if page.offset >= total:
        return [], total
    rows = conn.execute(
        stmt.order_by(*ordering).offset(page.offset).limit(page.page_size)
    ).all()
    return rows, total
