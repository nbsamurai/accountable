"""Card order on the board (spec 9.4).

Each deal has a `board_position`, and lower comes first. A dropped card takes the
midpoint of its new neighbors. When two neighbors get too close for a midpoint,
the column is renumbered 1, 2, 3 in the same order, in the same transaction.
"""

# Neighbors closer than this are renumbered before a card goes between them.
MIN_GAP = 0.000001


def top(first: float | None) -> float:
    """A place above the first card, or 1 in an empty column."""
    return 1.0 if first is None else first - 1


def bottom(last: float | None) -> float:
    """A place below the last card, or 1 in an empty column."""
    return 1.0 if last is None else last + 1


def between(above: float | None, below: float) -> float | None:
    """A place just above `below`, under `above` when there is one.

    Returns None when the two are too close, and the column needs renumbering first.
    """
    if above is None:
        return top(below)
    if below - above < MIN_GAP:
        return None
    return (above + below) / 2


def renumbered(count: int) -> list[float]:
    """The positions 1, 2, 3 … for a column of `count` cards, in their current order."""
    return [float(n) for n in range(1, count + 1)]
