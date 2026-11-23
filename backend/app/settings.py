"""The settings (spec 9.8). The three Supabase settings go together: all three, or none.

With all three, Accountable runs on Supabase. With none, it runs as a local copy, on a
SQLite file with local sign-in. An empty value counts as not set.
"""

import os
from collections.abc import Mapping
from dataclasses import dataclass

SUPABASE_SETTINGS = ("DATABASE_URL", "SUPABASE_URL", "SUPABASE_PUBLISHABLE_KEY")


class SettingsError(Exception):
    """Some of the Supabase settings are set, but not all of them."""


def setting(name: str, env: Mapping[str, str] | None = None) -> str | None:
    """One setting, or None when it's missing or empty."""
    value = (os.environ if env is None else env).get(name, "").strip()
    return value or None


@dataclass(frozen=True)
class Settings:
    database_url: str | None = None
    supabase_url: str | None = None
    publishable_key: str | None = None

    @property
    def on_supabase(self) -> bool:
        return self.database_url is not None


def read_settings(env: Mapping[str, str] | None = None) -> Settings:
    """The settings from the environment. Stops, naming the missing ones, on a partial set."""
    values = {name: setting(name, env) for name in SUPABASE_SETTINGS}
    missing = [name for name, value in values.items() if value is None]
    if 0 < len(missing) < len(SUPABASE_SETTINGS):
        raise SettingsError(
            "Accountable needs all three Supabase settings, or none of them to run as "
            f"a local copy. Missing: {', '.join(missing)}."
        )
    supabase_url = values["SUPABASE_URL"]
    return Settings(
        database_url=values["DATABASE_URL"],
        supabase_url=supabase_url.rstrip("/") if supabase_url else None,
        publishable_key=values["SUPABASE_PUBLISHABLE_KEY"],
    )
