from __future__ import annotations

import threading
from collections.abc import Generator
from datetime import datetime, timedelta

import pytest
from werkzeug.serving import make_server

from app import create_app


@pytest.fixture(scope="session")
def live_server() -> Generator[str, None, None]:
    app = create_app()
    server = make_server("127.0.0.1", 0, app)
    port = server.server_port

    thread = threading.Thread(target=server.serve_forever)
    thread.daemon = True
    thread.start()
    try:
        yield f"http://127.0.0.1:{port}"
    finally:
        server.shutdown()
        thread.join()


@pytest.mark.playwright
def test_countdown_validation_and_start(page, live_server) -> None:
    page.goto(f"{live_server}/")

    # Submit without selecting a date to surface validation error.
    page.click("text=Start countdown")
    page.wait_for_timeout(100)
    assert "Enter a target date" in (page.text_content("#form-error") or "")

    # Provide future datetime and verify countdown begins.
    future = (datetime.now() + timedelta(minutes=3)).strftime("%Y-%m-%dT%H:%M")
    page.fill("#event-label", "Demo Launch")
    page.fill("#target-datetime", future)
    page.click("text=Start countdown")

    wait_for_running = (
        "document.getElementById('status-message').textContent.includes("
        "'Countdown running')"
    )
    page.wait_for_function(wait_for_running, timeout=2000)
    status = page.text_content("#status-message") or ""
    assert "Countdown running" in status

    label_text = page.text_content("#active-label") or ""
    assert "Demo Launch" in label_text

    initial_seconds = page.text_content("[data-unit='seconds']")
    page.wait_for_timeout(1200)
    later_seconds = page.text_content("[data-unit='seconds']")

    assert initial_seconds is not None
    assert later_seconds is not None
    assert initial_seconds != later_seconds

    page.reload(wait_until="networkidle")

    wait_for_resumed = (
        "document.getElementById('status-message').textContent.includes("
        "'Countdown resumed')"
    )
    page.wait_for_function(wait_for_resumed, timeout=2000)

    label_after_reload = page.text_content("#active-label") or ""
    assert "Demo Launch" in label_after_reload

    assert page.is_hidden("#storage-warning")

    seconds_after_reload = page.text_content("[data-unit='seconds']")
    page.wait_for_timeout(1200)
    seconds_after_wait = page.text_content("[data-unit='seconds']")

    assert seconds_after_reload is not None
    assert seconds_after_wait is not None
    assert seconds_after_reload != seconds_after_wait
