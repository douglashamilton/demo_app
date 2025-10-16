from __future__ import annotations

from datetime import UTC, datetime

from flask import Flask, jsonify, render_template


def create_app() -> Flask:
    """Application factory returning a configured Flask instance."""
    app = Flask(__name__)

    @app.get("/")
    def index() -> str:
        server_now_utc_ms = int(datetime.now(UTC).timestamp() * 1000)
        bootstrap_payload = {"serverNowUtcMs": server_now_utc_ms}
        return render_template("index.html", bootstrap=bootstrap_payload)

    @app.get("/api/time")
    def api_time():
        now_ms = int(datetime.now(UTC).timestamp() * 1000)
        response = jsonify({"serverNowUtcMs": now_ms})
        response.headers["Cache-Control"] = "no-store"
        return response

    return app
