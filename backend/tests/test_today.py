"""Today is the date in the team's time zone, `TZ`, not on Render's UTC clock (spec 3.8)."""

from datetime import UTC, date, datetime

import pytest

from backend.app.deps import today_in_zone


@pytest.mark.parametrize(
    ("zone", "now", "today"),
    [
        (
            "America/New_York",
            datetime(2026, 11, 20, 3, 0, tzinfo=UTC),
            date(2026, 11, 19),
        ),
        (
            "America/New_York",
            datetime(2026, 11, 20, 5, 0, tzinfo=UTC),
            date(2026, 11, 20),
        ),
        ("Asia/Kolkata", datetime(2026, 11, 19, 20, 0, tzinfo=UTC), date(2026, 11, 20)),
    ],
)
def test_today_follows_tz_across_midnight_utc(monkeypatch, zone, now, today):
    monkeypatch.setenv("TZ", zone)
    assert today_in_zone(now) == today


def test_without_tz_today_is_the_computers_own(monkeypatch):
    monkeypatch.delenv("TZ", raising=False)
    now = datetime(2026, 11, 20, 3, 0, tzinfo=UTC)
    assert today_in_zone(now) == now.astimezone().date()
