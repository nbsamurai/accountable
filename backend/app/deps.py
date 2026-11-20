"""What the routes need on every request: a connection in a transaction, today and now.

Tests replace `get_today` and `get_now` to fix the date.
"""

from collections.abc import Iterator
from datetime import UTC, date, datetime
from typing import Annotated

from fastapi import Depends, Request
from sqlalchemy import Connection


def get_connection(request: Request) -> Iterator[Connection]:
    # One transaction per request. It commits before the response is sent
    # (scope="function" below), so the next request always sees the change.
    with request.app.state.engine.begin() as conn:
        yield conn


def get_today() -> date:
    """The date on the computer that runs Accountable."""
    return date.today()


def get_now() -> datetime:
    return datetime.now(UTC)


Conn = Annotated[Connection, Depends(get_connection, scope="function")]
Today = Annotated[date, Depends(get_today)]
Now = Annotated[datetime, Depends(get_now)]
