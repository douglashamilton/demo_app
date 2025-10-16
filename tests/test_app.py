from __future__ import annotations

import json
import re

from flask.testing import FlaskClient

from app import create_app


def test_root_route_returns_ok() -> None:
    app = create_app()
    client: FlaskClient = app.test_client()

    response = client.get("/")

    assert response.status_code == 200
    html = response.data.decode("utf-8")
    assert "<script type=\"application/json\" id=\"app-bootstrap\">" in html
    assert "id=\"countdown-form\"" in html

    match = re.search(
        r'<script type="application/json" id="app-bootstrap">(.*?)</script>',
        html,
        re.DOTALL,
    )
    assert match is not None, "bootstrap payload script tag missing"

    payload = json.loads(match.group(1))
    assert "serverNowUtcMs" in payload
    assert isinstance(payload["serverNowUtcMs"], int)
