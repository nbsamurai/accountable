from fastapi import APIRouter

from ..deps import Conn, Now, Today
from . import service

router = APIRouter(tags=["dashboard"])


@router.get("/dashboard")
def dashboard(conn: Conn, today: Today, now: Now):
    return service.dashboard(conn, today, now)
