"""Serves the built frontend, from frontend/dist, once `npm run build` has made it (spec 9.9).

Any address outside /api that isn't a file gets index.html, so a reload on /contacts/12
works. An unknown address under /api still gets the API's 404.
"""

from pathlib import Path

from fastapi import FastAPI, HTTPException

DIST = Path(__file__).resolve().parents[2] / "frontend" / "dist"


def mount_frontend(app: FastAPI, directory: Path = DIST) -> None:
    """Serves the built frontend when it exists. Without it, nothing outside /api answers."""
    if not (directory / "index.html").is_file():
        return

    @app.api_route("/api/{path:path}", methods=["GET", "HEAD"], include_in_schema=False)
    def unknown_api_address(path: str) -> None:
        raise HTTPException(status_code=404, detail="Not Found")

    app.frontend("/", directory=directory, fallback="index.html")
