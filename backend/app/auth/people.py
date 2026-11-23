"""The signed-in person, from their token, and their row in `people` (spec 2, Person)."""

from dataclasses import dataclass
from datetime import datetime
from typing import Any

from sqlalchemy import Connection, or_, update
from sqlalchemy.dialects import postgresql, sqlite

from ..tables import people


@dataclass(frozen=True)
class Person:
    id: str
    email: str
    name: str | None = None

    @property
    def shows_as(self) -> str:
        return shows_as(self.name, self.email)


def shows_as(name: str | None, email: str | None) -> str:
    """How a person shows: their name, or their email when they have no name."""
    return name or email or ""


def _text(value: Any) -> str | None:
    return value.strip() or None if isinstance(value, str) else None


def from_claims(claims: dict[str, Any]) -> Person:
    """The person a token names: `sub`, `email`, and `full_name` or `name` from their metadata."""
    metadata = claims.get("user_metadata")
    metadata = metadata if isinstance(metadata, dict) else {}
    return Person(
        id=str(claims["sub"]),
        email=_text(claims.get("email")) or "",
        name=_text(metadata.get("full_name")) or _text(metadata.get("name")),
    )


def keep(conn: Connection, person: Person, now: datetime) -> None:
    """Makes the person's row, or brings its email and name up to date.

    Several first requests can arrive at once, so the insert skips a row that's there.
    """
    dialect_insert = (
        postgresql.insert if conn.dialect.name == "postgresql" else sqlite.insert
    )
    conn.execute(
        dialect_insert(people)
        .values(
            id=person.id,
            email=person.email,
            name=person.name,
            created_at=now,
            updated_at=now,
        )
        .on_conflict_do_nothing(index_elements=[people.c.id])
    )
    conn.execute(
        update(people)
        .where(
            people.c.id == person.id,
            or_(
                people.c.email != person.email,
                people.c.name.is_distinct_from(person.name),
            ),
        )
        .values(email=person.email, name=person.name, updated_at=now)
    )
