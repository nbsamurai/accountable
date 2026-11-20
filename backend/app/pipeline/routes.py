from fastapi import APIRouter

from ..deps import Conn, Today
from .service import board

router = APIRouter(tags=["pipeline"])


@router.get("/pipeline")
def pipeline(conn: Conn, today: Today):
    return board(conn, today)
