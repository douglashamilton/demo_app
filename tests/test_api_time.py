from __future__ import annotations

import time

from flask.testing import FlaskClient

from app import create_app


def test_api_time_returns_monotonic_values() -> None:
    app = create_app()
    client: FlaskClient = app.test_client()

    first = client.get("/api/time")
    time.sleep(0.01)
    second = client.get("/api/time")

    assert first.status_code == 200
    assert second.status_code == 200

    first_value = first.get_json()["serverNowUtcMs"]
    second_value = second.get_json()["serverNowUtcMs"]

    assert isinstance(first_value, int)
    assert isinstance(second_value, int)
    assert second_value >= first_value
