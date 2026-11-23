"""Supabase tokens (spec 9.7), with signing keys the test makes and no network."""

import json
from datetime import UTC, datetime, timedelta
from typing import Any

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import ec, rsa
from jwt.algorithms import ECAlgorithm, RSAAlgorithm
from starlette.requests import HTTPConnection

from backend.app.auth.people import Person
from backend.app.auth.tokens import (
    REFETCH_SECONDS,
    InvalidToken,
    KeySet,
    KeysUnavailable,
    SupabaseSignIn,
    verify,
)

from .conftest import connections_opened

SUPABASE_URL = "https://project.supabase.example"
ISSUER = f"{SUPABASE_URL}/auth/v1"


@pytest.fixture(scope="module")
def ec_key():
    return ec.generate_private_key(ec.SECP256R1())


@pytest.fixture(scope="module")
def rsa_key():
    return rsa.generate_private_key(public_exponent=65537, key_size=2048)


def public_jwk(private_key, kid: str) -> dict[str, Any]:
    if isinstance(private_key, ec.EllipticCurvePrivateKey):
        found = json.loads(ECAlgorithm.to_jwk(private_key.public_key()))
        return {**found, "kid": kid, "alg": "ES256", "use": "sig"}
    found = json.loads(RSAAlgorithm.to_jwk(private_key.public_key()))
    return {**found, "kid": kid, "alg": "RS256", "use": "sig"}


class Keys:
    """A stand-in for the key fetch, which counts its calls and can change its keys."""

    def __init__(self, *jwks: dict[str, Any]) -> None:
        self.jwks = list(jwks)
        self.calls = 0

    def __call__(self) -> dict[str, Any]:
        self.calls += 1
        return {"keys": self.jwks}


class Clock:
    def __init__(self) -> None:
        self.now = 1000.0

    def __call__(self) -> float:
        return self.now


def token(private_key, kid: str = "k1", algorithm: str = "ES256", **claims) -> str:
    now = datetime.now(UTC)
    body = {
        "sub": "8d0c6f8e-person",
        "email": "sam.lee@team.example",
        "aud": "authenticated",
        "iss": ISSUER,
        "iat": now,
        "exp": now + timedelta(hours=1),
        "user_metadata": {"full_name": "Sam Lee"},
        **claims,
    }
    return jwt.encode(body, private_key, algorithm=algorithm, headers={"kid": kid})


@pytest.fixture
def keys(ec_key, rsa_key) -> Keys:
    return Keys(public_jwk(ec_key, "k1"), public_jwk(rsa_key, "r1"))


def test_a_valid_es256_or_rs256_token_passes(ec_key, rsa_key, keys):
    key_set = KeySet(keys)
    assert verify(token(ec_key), key_set, SUPABASE_URL)["sub"] == "8d0c6f8e-person"
    rs256 = token(rsa_key, kid="r1", algorithm="RS256")
    assert verify(rs256, key_set, SUPABASE_URL)["sub"] == "8d0c6f8e-person"


@pytest.mark.parametrize(
    ("metadata", "name"),
    [
        ({"full_name": "Sam Lee", "name": "Sammy"}, "Sam Lee"),
        ({"name": "Sammy"}, "Sammy"),
        ({"full_name": "  "}, None),
        ({}, None),
    ],
)
def test_the_person_comes_from_the_token(ec_key, keys, metadata, name):
    sign_in = SupabaseSignIn(SUPABASE_URL, "test-publishable-key", fetch=keys)
    connection = HTTPConnection({"type": "http", "headers": []})
    person = sign_in.person(token(ec_key, user_metadata=metadata), connection)
    assert person == Person(
        id="8d0c6f8e-person", email="sam.lee@team.example", name=name
    )


@pytest.fixture
def other_key():
    return ec.generate_private_key(ec.SECP256R1())


@pytest.mark.parametrize(
    "make",
    [
        pytest.param(lambda key, other: "", id="missing"),
        pytest.param(lambda key, other: "not-a-token", id="malformed"),
        pytest.param(
            lambda key, other: token(key, exp=datetime.now(UTC) - timedelta(seconds=5)),
            id="expired",
        ),
        pytest.param(lambda key, other: token(other), id="bad signature"),
        pytest.param(lambda key, other: token(key, aud="anon"), id="wrong audience"),
        pytest.param(
            lambda key, other: token(key, iss="https://elsewhere.example/auth/v1"),
            id="wrong issuer",
        ),
        pytest.param(lambda key, other: token(other, kid="k9"), id="unknown key"),
        pytest.param(
            lambda key, other: jwt.encode(
                {"sub": "x", "aud": "authenticated", "iss": ISSUER},
                "a-shared-secret-of-32-characters!",
                algorithm="HS256",
                headers={"kid": "k1"},
            ),
            id="HS256",
        ),
        pytest.param(
            lambda key, other: token(key, kid="r1", algorithm="ES256"),
            id="algorithm that doesn't match the key",
        ),
        pytest.param(lambda key, other: token(key, sub=None), id="no subject"),
    ],
)
def test_bad_tokens_get_401(app, anonymous, ec_key, other_key, keys, make):
    app.state.sign_in = SupabaseSignIn(SUPABASE_URL, "test-publishable-key", fetch=keys)
    good = anonymous.get(
        "/api/me", headers={"Authorization": f"Bearer {token(ec_key)}"}
    )
    assert good.status_code == 200, good.text

    response = anonymous.get(
        "/api/me", headers={"Authorization": f"Bearer {make(ec_key, other_key)}"}
    )
    assert response.status_code == 401
    assert response.headers["WWW-Authenticate"] == "Bearer"


def test_the_keys_are_fetched_once_and_kept(ec_key, keys):
    key_set = KeySet(keys)
    for _ in range(3):
        verify(token(ec_key), key_set, SUPABASE_URL)
    assert keys.calls == 1


def test_an_unknown_key_fetches_the_keys_again_once(ec_key, other_key, keys):
    clock = Clock()
    key_set = KeySet(keys, clock=clock)
    verify(token(ec_key), key_set, SUPABASE_URL)
    clock.now += REFETCH_SECONDS

    # The project rotated its keys: the new one is found after one more fetch.
    keys.jwks.append(public_jwk(other_key, "k2"))
    assert verify(token(other_key, kid="k2"), key_set, SUPABASE_URL)["sub"]
    assert keys.calls == 2

    # Made-up keys don't fetch again until a minute has passed.
    for kid in ("k8", "k9"):
        with pytest.raises(InvalidToken):
            verify(token(other_key, kid=kid), key_set, SUPABASE_URL)
    assert keys.calls == 2


def test_keys_that_cant_be_fetched_give_503(app, anonymous, ec_key):
    def fail() -> dict:
        raise KeysUnavailable("no network")

    app.state.sign_in = SupabaseSignIn(SUPABASE_URL, "test-publishable-key", fetch=fail)
    opened = connections_opened(app.state.engine)
    response = anonymous.get(
        "/api/me", headers={"Authorization": f"Bearer {token(ec_key)}"}
    )
    assert response.status_code == 503
    # The key fetch can take seconds, so it mustn't hold a database connection.
    assert opened == []
