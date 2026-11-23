"""The three Supabase settings go together: all three, or none (spec 9.8)."""

import pytest

from backend.app.main import create_app
from backend.app.settings import Settings, SettingsError, read_settings

ALL = {
    "DATABASE_URL": "postgresql://nobody@127.0.0.1:1/none",
    "SUPABASE_URL": "https://project.supabase.example/",
    "SUPABASE_PUBLISHABLE_KEY": "test-publishable-key",
}


def test_all_three_settings_mean_supabase():
    settings = read_settings(ALL)
    assert settings.on_supabase
    assert settings == Settings(
        database_url="postgresql://nobody@127.0.0.1:1/none",
        supabase_url="https://project.supabase.example",
        publishable_key="test-publishable-key",
    )


def test_none_means_a_local_copy_and_an_empty_value_counts_as_none():
    assert read_settings({}) == Settings()
    assert not read_settings({}).on_supabase
    blank = {name: " " for name in ALL}
    assert read_settings(blank) == Settings()


@pytest.mark.parametrize(
    ("present", "missing"),
    [
        (["DATABASE_URL"], "SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY"),
        (["SUPABASE_URL", "SUPABASE_PUBLISHABLE_KEY"], "DATABASE_URL"),
        (["DATABASE_URL", "SUPABASE_URL"], "SUPABASE_PUBLISHABLE_KEY"),
    ],
)
def test_one_or_two_settings_stop_and_name_the_missing_ones(present, missing):
    with pytest.raises(SettingsError, match=f"Missing: {missing}."):
        read_settings({name: ALL[name] for name in present})


def test_the_backend_stops_on_a_partial_set(monkeypatch, tmp_path):
    monkeypatch.setenv("SUPABASE_URL", ALL["SUPABASE_URL"])
    monkeypatch.setenv("SUPABASE_PUBLISHABLE_KEY", "")
    with pytest.raises(SystemExit) as stopped:
        create_app(tmp_path / "never.db")
    assert "Missing: DATABASE_URL, SUPABASE_PUBLISHABLE_KEY." in str(stopped.value)
    assert not (tmp_path / "never.db").exists()
