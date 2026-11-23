"""Local sign-in (spec 3.10), for a copy that runs without the Supabase settings.

The sign-in screen lists the made-up teammates, and choosing one signs in as them with no
password. The backend signs those tokens with a key it makes when it starts, so a restart
signs everyone out. Signing in and every local token work only on a connection to
127.0.0.1, the address the connection arrived on, whatever its Host header says, so a
copy that another computer can reach never offers sign-in without a password.
"""

import secrets
from datetime import UTC, datetime, timedelta

import jwt
from starlette.requests import HTTPConnection

from .people import Person, from_claims
from .tokens import InvalidToken

LOOPBACK = "127.0.0.1"
ISSUER = "accountable-local"
ALGORITHM = "HS256"
LIFETIME = timedelta(hours=12)


class NotOnThisComputer(Exception):
    """The connection didn't arrive on 127.0.0.1."""


def on_loopback(connection: HTTPConnection) -> bool:
    server = connection.scope.get("server")
    return bool(server) and server[0] == LOOPBACK


class LocalSignIn:
    mode = "local"

    def __init__(self) -> None:
        self.key = secrets.token_bytes(32)

    def token_for(self, person: Person, now: datetime | None = None) -> str:
        issued = now or datetime.now(UTC)
        return jwt.encode(
            {
                "sub": person.id,
                "email": person.email,
                "user_metadata": {"full_name": person.name},
                "aud": ISSUER,
                "iss": ISSUER,
                "iat": issued,
                "exp": issued + LIFETIME,
            },
            self.key,
            algorithm=ALGORITHM,
        )

    def person(self, token: str, connection: HTTPConnection) -> Person:
        if not on_loopback(connection):
            raise InvalidToken("Local sign-in works only on this computer.")
        try:
            claims = jwt.decode(
                token,
                self.key,
                algorithms=[ALGORITHM],
                audience=ISSUER,
                issuer=ISSUER,
                options={"require": ["exp", "sub"]},
            )
        except jwt.PyJWTError as error:
            raise InvalidToken(str(error)) from error
        return from_claims(claims)
