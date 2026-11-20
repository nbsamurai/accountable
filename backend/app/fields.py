"""The input rules of spec 2, shared by every record's schemas.

Text is trimmed, and an empty field is stored as empty (None). Each rule gives a
plain message, which the API returns with its field in FastAPI's 422 shape.
"""

import re
from typing import Annotated, Any
from urllib.parse import urlsplit

from pydantic import AfterValidator, BeforeValidator
from pydantic_core import PydanticCustomError

from .tables import NAME_LENGTH

EMAIL = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
SCHEME = re.compile(r"^([a-z][a-z0-9+.-]*):", re.IGNORECASE)


def _error(kind: str, message: str) -> PydanticCustomError:
    return PydanticCustomError(kind, message)


def _trimmed(value: Any) -> Any:
    return value.strip() if isinstance(value, str) else value


def clean_name(value: Any) -> str:
    value = _trimmed(value)
    if value is None or value == "":
        raise _error("name_required", "Enter a name.")
    if not isinstance(value, str):
        raise _error("name_type", "Enter the name as text.")
    if len(value) > NAME_LENGTH:
        raise _error("name_too_long", f"Use {NAME_LENGTH} characters or fewer.")
    return value


def blank_to_none(value: Any) -> Any:
    value = _trimmed(value)
    return None if value == "" else value


def clean_required_text(value: Any) -> Any:
    value = _trimmed(value)
    if value is None or value == "":
        raise _error("text_required", "Enter a description.")
    return value


def clean_website(value: Any) -> Any:
    """`northpeak.example` becomes `https://northpeak.example`. Only http and https are allowed."""
    value = blank_to_none(value)
    if not isinstance(value, str):
        return value
    match = SCHEME.match(value)
    if "://" in value or (match and not value[match.end() :].split("/")[0].isdigit()):
        scheme = value.split(":", 1)[0].lower()
        if scheme not in ("http", "https") or not value.lower().startswith(f"{scheme}://"):
            raise _error("website_scheme", "Enter a web address that starts with http:// or https://.")
    else:
        value = f"https://{value}"
    parts = urlsplit(value)
    if not parts.hostname or " " in value:
        raise _error("website_invalid", "Enter a web address, such as northpeak.example.")
    return value


def clean_email(value: Any) -> Any:
    value = blank_to_none(value)
    if isinstance(value, str) and not EMAIL.match(value):
        raise _error("email_invalid", "Enter an email address, such as jane@northpeak.example.")
    return value


def check_value(value: int | None) -> int | None:
    if value is not None and value < 0:
        raise _error("value_negative", "Enter a value of 0 or more.")
    return value


def check_probability(value: int | None) -> int | None:
    if value is not None and not 0 <= value <= 100:
        raise _error("probability_range", "Enter a probability from 0 to 100.")
    return value


Name = Annotated[str, BeforeValidator(clean_name)]
Text = Annotated[str | None, BeforeValidator(blank_to_none)]
RequiredText = Annotated[str, BeforeValidator(clean_required_text)]
Website = Annotated[str | None, BeforeValidator(clean_website)]
Email = Annotated[str | None, BeforeValidator(clean_email)]
Money = Annotated[int | None, AfterValidator(check_value)]
Percent = Annotated[int, AfterValidator(check_probability)]
