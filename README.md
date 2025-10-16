# Countdown Timer App

Local-first Flask web application that keeps a live, accessible countdown running in your browser so project milestones never slip off the radar. Users can enter a target date/time, and the app handles accurate ticking, even after refreshes.

## Features

- Python 3.12 + Flask 3.x server with HTML templating and `/api/time` endpoint for drift correction.
- Offline-friendly static assets: local Day.js bundle and handcrafted CSS (no CDN reliance).
- Client-side countdown logic with validation, accessibility-focused UI, and graceful fallbacks.
- Persistence via `localStorage` with automatic resume after refresh, plus server resync every 5 minutes.
- End-to-end Playwright test exercising the core flow.

## Prerequisites

- Python 3.12+
- (Optional) [Node.js](https://nodejs.org/) if you prefer running Playwright via `npx`, though the project uses `python -m playwright`.

## Setup

```bash
# 1. Create & activate a virtual environment
python -m venv .venv
. .venv/Scripts/activate           # PowerShell: .\.venv\Scripts\Activate.ps1

# 2. Install app + dev dependencies
pip install -e ".[dev]"

# 3. Install Playwright browsers (once)
python -m playwright install chromium
```

## Running the app

```bash
python app.py
```

Visit `http://localhost:5000` to set or resume a countdown. The UI highlights validation errors, shows current status, and syncs against server time.

## Testing & quality

```bash
# Run unit + end-to-end tests (includes Playwright)
pytest

# Lint and format
ruff check .
black .
```

To wire the checks before each commit:

```bash
pre-commit install
pre-commit run --all-files
```

## Optional production serving

Flask's built-in server is ideal for local use. For longer-running sessions or kiosk deployments on Windows, install [waitress](https://docs.pylonsproject.org/projects/waitress/en/latest/) and serve the app:

```bash
pip install waitress
waitress-serve --call app:create_app
```

## Troubleshooting

- **Countdown does not persist after refresh**: Some privacy modes block `localStorage`. The UI will display a banner if persistence is unavailable—leave the tab open or adjust browser settings.
- **Playwright tests fail**: Ensure Chromium is installed via `python -m playwright install chromium`. You can skip Playwright tests temporarily with `pytest -m "not playwright"`.
- **Clock drift**: The client syncs with `/api/time` every five minutes. If you notice drift, check server and system clocks.
