"""The stages, their probabilities, expected revenue and late deals (spec 3.1, 3.3 and 3.8)."""

from datetime import date
from typing import Literal

Stage = Literal["new", "qualified", "proposal", "negotiation", "won", "lost"]

# In pipeline order, with each stage's usual probability of close.
STAGES: tuple[Stage, ...] = (
    "new",
    "qualified",
    "proposal",
    "negotiation",
    "won",
    "lost",
)
OPEN_STAGES: tuple[Stage, ...] = ("new", "qualified", "proposal", "negotiation")
CLOSED_STAGES: tuple[Stage, ...] = ("won", "lost")
FUNNEL_STAGES: tuple[Stage, ...] = (
    "new",
    "qualified",
    "proposal",
    "negotiation",
    "won",
)

PROBABILITY: dict[Stage, int] = {
    "new": 10,
    "qualified": 25,
    "proposal": 50,
    "negotiation": 75,
    "won": 100,
    "lost": 0,
}

NAMES: dict[Stage, str] = {
    "new": "New",
    "qualified": "Qualified",
    "proposal": "Proposal",
    "negotiation": "Negotiation",
    "won": "Won",
    "lost": "Lost",
}

ORDER: dict[Stage, int] = {stage: index for index, stage in enumerate(STAGES)}


def is_open(stage: str) -> bool:
    return stage in OPEN_STAGES


def is_late(stage: str, close_date: date | None, today: date) -> bool:
    """An open deal whose close date is before today. No close date is never late."""
    return is_open(stage) and close_date is not None and close_date < today


def round_cents(total_dollar_percent: int) -> int:
    """Divides a sum of value × percent by 100 once, rounding halves up.

    Python's round() rounds halves to even, so this rounds by hand. Values are never negative.
    """
    return (total_dollar_percent + 50) // 100


def expected_revenue(value: int | None, probability: int) -> int:
    """One deal's value × probability, to the dollar. An empty value counts as $0."""
    return round_cents((value or 0) * probability)


def move_description(old: Stage, new: Stage) -> str:
    return f"Moved from {NAMES[old]} to {NAMES[new]}"
