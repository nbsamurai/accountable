"""`npm run seed`: resets a local database to the sample data. `--large` loads the large data set.

It refuses when DATABASE_URL is set, so nobody resets the team's data on Supabase (spec 9.6).
"""

import argparse
import sys
import time

from ..db import database_path, make_engine, reset, sqlite_url
from ..settings import setting
from . import large_data, sample_data

REFUSED = (
    "npm run seed only resets a local database. DATABASE_URL points at the team's "
    "database on Supabase, so nothing changed."
)


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(prog="npm run seed", description=__doc__)
    parser.add_argument(
        "--large",
        action="store_true",
        help="load the large data set, for the performance test",
    )
    args = parser.parse_args(argv)
    if setting("DATABASE_URL"):
        sys.exit(REFUSED)

    path = database_path()
    engine = make_engine(sqlite_url(path))
    started = time.perf_counter()
    reset(engine, large_data.load if args.large else sample_data.load)
    engine.dispose()
    kind = "the large data set" if args.large else "the sample data"
    print(f"Reset {path.name} to {kind} in {time.perf_counter() - started:.1f} s.")


if __name__ == "__main__":
    main()
