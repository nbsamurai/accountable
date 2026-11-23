"""Checks a Supabase access token (spec 9.7).

The signature must match one of the project's public signing keys, from
`SUPABASE_URL/auth/v1/.well-known/jwks.json`. The token must not have expired, its audience
must be `authenticated`, and its issuer `SUPABASE_URL/auth/v1`. Only ES256 and RS256 are
accepted, so a project still on the old shared secret (HS256) can't sign anyone in.
"""

import json
import threading
import time
import urllib.request
from collections.abc import Callable
from typing import Any

import jwt
from jwt import PyJWK, PyJWKSet
from starlette.requests import HTTPConnection

from .people import Person, from_claims

ALGORITHMS = ("ES256", "RS256")
AUDIENCE = "authenticated"
# A token that names an unknown key fetches the keys again, at most this often.
REFETCH_SECONDS = 60.0

Fetch = Callable[[], dict[str, Any]]


class InvalidToken(Exception):
    """The token is missing, malformed, expired, or not signed by the project."""


class KeysUnavailable(Exception):
    """The project's signing keys couldn't be fetched."""


def fetch_from(url: str, publishable_key: str) -> Fetch:
    """Fetches the key set over HTTPS, with Python's own client."""

    def fetch() -> dict[str, Any]:
        request = urllib.request.Request(url, headers={"apikey": publishable_key})
        try:
            with urllib.request.urlopen(request, timeout=5) as response:
                return json.load(response)
        except (OSError, ValueError) as error:
            raise KeysUnavailable(str(error)) from error

    return fetch


class KeySet:
    """The project's public signing keys, fetched on first use and kept.

    They're fetched again only for a token that names a key the set doesn't have, and
    then at most once every REFETCH_SECONDS, so made-up keys can't flood Supabase.
    """

    def __init__(
        self, fetch: Fetch, clock: Callable[[], float] = time.monotonic
    ) -> None:
        self.fetch = fetch
        self.clock = clock
        self.keys: PyJWKSet | None = None
        self.fetched_at = 0.0
        self.lock = threading.Lock()

    def _load(self) -> None:
        try:
            self.keys = PyJWKSet.from_dict(self.fetch())
        except jwt.PyJWTError as error:
            raise KeysUnavailable(str(error)) from error
        self.fetched_at = self.clock()

    def _find(self, kid: str) -> PyJWK | None:
        if self.keys is None:
            return None
        try:
            return self.keys[kid]
        except KeyError:
            return None

    def key(self, kid: str) -> PyJWK:
        with self.lock:
            if self.keys is None:
                self._load()
            found = self._find(kid)
            if found is None and self.clock() - self.fetched_at >= REFETCH_SECONDS:
                self._load()
                found = self._find(kid)
        if found is None:
            raise InvalidToken("The token names an unknown key.")
        return found


def verify(token: str, keys: KeySet, supabase_url: str) -> dict[str, Any]:
    """The token's claims, once its signature, expiry, audience and issuer check out."""
    try:
        header = jwt.get_unverified_header(token)
    except jwt.PyJWTError as error:
        raise InvalidToken(str(error)) from error
    algorithm, kid = header.get("alg"), header.get("kid")
    if algorithm not in ALGORITHMS or not isinstance(kid, str):
        raise InvalidToken("The token isn't signed with one of the project's keys.")
    key = keys.key(kid)
    if key.algorithm_name != algorithm:
        raise InvalidToken("The token's algorithm doesn't match its key.")
    try:
        return jwt.decode(
            token,
            key,
            algorithms=[algorithm],
            audience=AUDIENCE,
            issuer=f"{supabase_url}/auth/v1",
            options={"require": ["exp", "sub", "aud", "iss"]},
        )
    except jwt.PyJWTError as error:
        raise InvalidToken(str(error)) from error


class SupabaseSignIn:
    """Sign-in through Supabase Auth: the person comes from a checked Supabase token."""

    mode = "supabase"

    def __init__(
        self, supabase_url: str, publishable_key: str, fetch: Fetch | None = None
    ) -> None:
        self.supabase_url = supabase_url
        self.keys = KeySet(
            fetch
            or fetch_from(
                f"{supabase_url}/auth/v1/.well-known/jwks.json", publishable_key
            )
        )

    def person(self, token: str, connection: HTTPConnection) -> Person:
        return from_claims(verify(token, self.keys, self.supabase_url))
