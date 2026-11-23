"""Search in the top bar (spec 4.12): up to 5 organizations, 5 contacts and 5 deals.

A record matches when its folded name holds the folded search, so case folding covers A to
Z the same on SQLite and Postgres. Names that start with the search come first, then the
rest, each A to Z. Each match comes with its detail.
"""

from typing import Any

from sqlalchemy import ColumnElement, Connection, Select, case, select

from ..lists import fold, fold_text
from ..tables import contacts, deals, organizations

LIMIT = 5


def matching(stmt: Select, name: ColumnElement[Any], tiebreak, term: str) -> Select:
    folded = fold(name)
    starts = case((folded.startswith(term, autoescape=True), 0), else_=1)
    return (
        stmt.where(folded.contains(term, autoescape=True))
        .order_by(starts, folded, tiebreak)
        .limit(LIMIT)
    )


def _organizations(conn: Connection, term: str) -> list[dict[str, Any]]:
    o = organizations.c
    stmt = select(o.id, o.name, o.industry)
    rows = conn.execute(matching(stmt, o.name, o.id, term))
    return [row._asdict() for row in rows]


def _contacts(conn: Connection, term: str) -> list[dict[str, Any]]:
    c = contacts.c
    stmt = select(c.id, c.name, organizations.c.name.label("organization")).select_from(
        contacts.outerjoin(organizations, organizations.c.id == c.organization_id)
    )
    rows = conn.execute(matching(stmt, c.name, c.id, term))
    return [row._asdict() for row in rows]


def _deals(conn: Connection, term: str) -> list[dict[str, Any]]:
    d = deals.c
    stmt = select(
        d.id, d.name, organizations.c.name.label("organization"), d.stage
    ).select_from(
        deals.outerjoin(organizations, organizations.c.id == d.organization_id)
    )
    rows = conn.execute(matching(stmt, d.name, d.id, term))
    return [row._asdict() for row in rows]


def search(conn: Connection, q: str) -> dict[str, list[dict[str, Any]]]:
    term = fold_text(q.strip())
    if not term:
        return {"organizations": [], "contacts": [], "deals": []}
    return {
        "organizations": _organizations(conn, term),
        "contacts": _contacts(conn, term),
        "deals": _deals(conn, term),
    }
