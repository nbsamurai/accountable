"""How to sign in, local sign-in, and the signed-in person (spec 9.4).

`/auth/config` and `/auth/local` are open to everyone and hold no records. `/me` needs a token.
"""

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from ..deps import CurrentPerson
from ..errors import invalid
from ..seed.sample_data import TEAMMATES
from .local import LocalSignIn, on_loopback
from .people import Person

open_router = APIRouter(tags=["auth"])
router = APIRouter(tags=["auth"])


class LocalSignInIn(BaseModel):
    person_id: str


class PersonOut(BaseModel):
    id: str
    email: str
    name: str | None


@open_router.get("/auth/config")
def auth_config(request: Request) -> dict:
    if not isinstance(request.app.state.sign_in, LocalSignIn):
        settings = request.app.state.settings
        return {
            "mode": "supabase",
            "supabase_url": settings.supabase_url,
            "publishable_key": settings.publishable_key,
        }
    return {
        "mode": "local",
        "people": [teammate._asdict() for teammate in TEAMMATES],
    }


@open_router.post("/auth/local")
def local_sign_in(data: LocalSignInIn, request: Request) -> dict:
    """Signs in as one of the made-up teammates, with no password, on a local copy only."""
    sign_in = request.app.state.sign_in
    if not isinstance(sign_in, LocalSignIn):
        raise HTTPException(status_code=404, detail="Not Found")
    if not on_loopback(request):
        raise HTTPException(
            status_code=403, detail="Local sign-in works only on this computer."
        )
    teammate = next((t for t in TEAMMATES if t.id == data.person_id), None)
    if teammate is None:
        raise invalid("person_id", "Choose one of the teammates.")
    person = Person(id=teammate.id, email=teammate.email, name=teammate.name)
    return {"access_token": sign_in.token_for(person)}


@router.get("/me", response_model=PersonOut)
def me(person: CurrentPerson):
    return person
