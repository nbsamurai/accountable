"""`npm run seed`: resets the database to the sample data. `--large` loads the large data set."""

import argparse
import time

from ..db import database_path, make_engine, reset
from . import large_data, sample_data


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(prog="npm run seed", description=__doc__)
    parser.add_argument(
        "--large",
        action="store_true",
        help="load the large data set, for the performance test",
    )
    args = parser.parse_args(argv)

    path = database_path()
    engine = make_engine(path)
    started = time.perf_counter()
    reset(engine, large_data.load if args.large else sample_data.load)
    engine.dispose()
    kind = "the large data set" if args.large else "the sample data"
    print(f"Reset {path.name} to {kind} in {time.perf_counter() - started:.1f} s.")


if __name__ == "__main__":
    main()
