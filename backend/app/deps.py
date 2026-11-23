"""What the routes need on every request: a connection, the signed-in person, today and now.

Tests replace `get_today` and `get_now` to fix the date.
"""

from collections.abc import Iterator
from datetime import UTC, date, datetime
from typing import Annotated
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from fastapi import Depends, HTTPException, Request
from sqlalchemy import Connection

from .auth import people
from .auth.people import Person
from .auth.tokens import InvalidToken, KeysUnavailable
from .settings import setting


def get_connection(request: Request) -> Iterator[Connection]:
    # One transaction per request. It commits before the response is sent
    # (scope="function" below), so the next request always sees the change.
    with request.app.state.engine.begin() as conn:
        yield conn


def today_in_zone(now: datetime) -> date:
    """The date at `now` in the team's time zone, `TZ`, or the computer's own (spec 3.8)."""
    zone = setting("TZ")
    if zone:
        try:
            return now.astimezone(ZoneInfo(zone.removeprefix(":"))).date()
        except (ZoneInfoNotFoundError, ValueError):
            pass
    return now.astimezone().date()


def get_today() -> date:
    return today_in_zone(datetime.now(UTC))


def get_now() -> datetime:
    return datetime.now(UTC)


Conn = Annotated[Connection, Depends(get_connection, scope="function")]
Today = Annotated[date, Depends(get_today)]
Now = Annotated[datetime, Depends(get_now)]


def _bearer(request: Request) -> str:
    scheme, _, token = request.headers.get("authorization", "").partition(" ")
    if scheme.lower() != "bearer" or not token.strip():
        raise InvalidToken("No token.")
    return token.strip()


def get_token_person(request: Request) -> Person:
    """Checks the token and gives the person it names (spec 9.7). Opens no connection.

    The person comes only from the token, never from the request's body, address or
    other headers.
    """
    try:
        return request.app.state.sign_in.person(_bearer(request), request)
    except InvalidToken as error:
        raise HTTPException(
            status_code=401,
            detail="Sign in to continue.",
            headers={"WWW-Authenticate": "Bearer"},
        ) from error
    except KeysUnavailable as error:
        raise HTTPException(
            status_code=503, detail="Can't reach the sign-in service."
        ) from error


TokenPerson = Annotated[Person, Depends(get_token_person)]


def get_person(person: TokenPerson, conn: Conn, now: Now) -> Person:
    """Gives the route the signed-in person, and keeps their row up to date.

    FastAPI resolves the parameters in order, so the token is checked before the
    connection opens. A request without a valid token never holds a connection.
    """
    people.keep(conn, person, now)
    return person


CurrentPerson = Annotated[Person, Depends(get_person)]
