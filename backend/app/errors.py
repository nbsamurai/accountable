"""The API's errors, in FastAPI's own shapes (spec 9.3).

- 422: `{"detail": [{"loc": ["body", field], "msg": message, "type": ...}]}`
- 404 and 409: `{"detail": message}`
"""

from fastapi import HTTPException
from fastapi.exceptions import RequestValidationError


def invalid(field: str, message: str, where: str = "body") -> RequestValidationError:
    return RequestValidationError([{"loc": (where, field), "msg": message, "type": "value_error"}])


def not_found(kind: str) -> HTTPException:
    return HTTPException(status_code=404, detail=f"This {kind} no longer exists.")


def conflict(message: str) -> HTTPException:
    return HTTPException(status_code=409, detail=message)
