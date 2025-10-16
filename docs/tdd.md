## TDD Template

### Bottom line

Ship a minimal Flask 3.x web app backed by Python 3.12 that serves a single-page countdown experience: users provide a future date/time, the browser runs a second-by-second timer, and the UI persists the target locally so refreshes resume. The design emphasizes accurate time math (server-provided baseline, client updates with Day.js), accessible presentation, and a zero-external-dependency bundle that can run entirely offline after install.

### Architecture Overview

* **Stack:** Python 3.12, Flask 3.1 for HTTP layer, Jinja2 templating, Day.js (bundled locally) plus vanilla ES modules for client logic, pytest with coverage for tests, ruff and black for lint/format.
* **App structure:** Server-rendered shell delivering a single-page experience; a lightweight client-side state machine handles form interactions and countdown ticks, so no SPA framework is required.
* **Data storage:** No server persistence. Countdown configuration is stored in browser `localStorage` under `countdown-target`. Server keeps no session data.
* **Auth:** None (local-only app, no multi-user context).
* **Deployment & environments:** Local dev via `python app.py` (Flask dev server with reload). Optional production guidance provided for `waitress` to support long-running Windows services. CI (if configured) runs lint and test jobs; no hosted deployment pipeline needed for MVP.

### Tech Stack Decisions

* **Backend runtime:** Python 3.12 chosen per requirements; Flask offers fast routing and templating with minimal dependencies.
* **Templating/UI:** Jinja2 renders base HTML and embeds initial server timestamp (`server_now_utc_ms`). Semantic HTML and custom CSS (no CDN) satisfy accessibility and offline needs.
* **Client timing:** Day.js handles parsing, diff, and formatting. Countdown loop uses `requestAnimationFrame` when focused with a `setTimeout` fallback every second to mitigate throttling.
* **Persistence:** Browser `localStorage` retains `{ targetIso, label }`. Validation ensures stored targets remain in the future before resuming.
* **Testing libraries:** pytest for backend, `freezegun` (or manual `datetime` patching) for time helpers, and optional `pytest-playwright` for smoke UI checks. Coverage target set to 80%+ on backend helpers.
* **Quality tooling:** ruff for linting, black for formatting, pre-commit configuration runs lint + tests before pushes. Optional mypy available for future typing.

### Interfaces

* **GET /** - Renders HTML countdown page.  
  * Response 200: HTML page embedding JSON config `{ "serverNowUtcMs": <int> }`.  
  * Errors: 500 returns template error page; logs capture stack trace.
* **GET /static/\*** - Serves bundled JS/CSS assets with cache headers.
* **GET /api/time** - Returns current server UTC timestamp (milliseconds) so the client can resync.  
  * Response 200: `{ "serverNowUtcMs": 1723492342345 }`  
  * Response 500: `{ "error": "SERVER_ERROR", "message": "Unable to calculate server time." }`

Client-side submission validates the future target and shows inline errors. Network failures during `/api/time` fetches are caught; the app continues using the last known offset.

### Domain model

* **CountdownTarget (client side)**  
  * `id`: string (always `"primary"` for MVP)  
  * `label`: string, optional, max 80 characters, sanitized for display  
  * `targetIso`: ISO 8601 timestamp in UTC  
  * `createdAt`: epoch milliseconds (when user set the target)  
  * Invariant: `targetIso` must be greater than the current time when saved.
* **TimeBaseline (server helper)**  
  * `server_utc_ms`: integer epoch milliseconds  
  * `generated_at`: `datetime` object for testability  
  * Scope: request-only, no persistence.

### Data flow & interfaces

**Inbound:**  
1. User requests `GET /`.  
2. Flask renders template with baseline `server_utc_ms`.  
3. Browser loads JS, hydrates state from `localStorage`, and populates the form.  
4. On submission, JS parses the target via Day.js, validates against synced server time, saves to `localStorage`, and starts the countdown ticker.  
5. The ticker periodically calls `/api/time` (every ~5 minutes) to correct drift.

**Outbound:**  
* UI updates DOM counters (days/hours/minutes/seconds) each second, using an `aria-live="polite"` region for accessibility.  
* When the countdown reaches zero, the display flips to a 'Time's up' state (future enhancement may add alerts).  
* No further server writes occur; only occasional GET requests for time resync.

**API contract example:**

```http
GET /api/time
Response 200:
{
  "serverNowUtcMs": 1723500000000
}
Response 500:
{
  "error": "SERVER_ERROR",
  "message": "Unable to calculate server time."
}
Auth: none
Cache-Control: no-store
```

### Tooling & workflows

* **Testing:**  
  * Backend unit tests verify baseline generator and `/api/time` output.  
  * JS logic unit tests (run via playwright or a DOM-capable harness) cover countdown diff and validation helpers.  
  * Manual acceptance checklist ensures persistence, refresh behavior, and accessibility (keyboard navigation + screen-reader labels). Target >= 80% statement coverage on backend code.
* **Quality gates:**  
  * `ruff` and `black --check` enforced via pre-commit hook.  
  * `pytest` runs in CI and locally before merging.  
  * Optional mypy stage can be introduced once type hints are added.
* **Collaboration:**  
  * Git branches per feature slice, PRs require reviewer sign-off plus passing checks.  
  * Update `README.md` with setup instructions and architecture summary alongside implementation.

### Risks & mitigations

1. **Client/server clock drift** - Embed server timestamp on render and provide `/api/time` resync; fall back gracefully if the fetch fails.  
2. **Browser timer throttling in background tabs** - Use `requestAnimationFrame` while focused and recompute remaining time from the stored target when the tab regains focus.  
3. **Accessibility regression** - Build with semantic elements, run axe-core audits during QA, and include tests for ARIA hooks.  
4. **localStorage unavailable (privacy mode)** - Detect storage errors; degrade to in-memory state and show a banner explaining persistence limits.  
5. **Bundled dependencies aging** - Pin Day.js and revisit quarterly; document upgrade steps.

### Assumptions

* Users run modern evergreen browsers with ES6 module support and `Intl`.  
* `localStorage` is generally available; inability to persist is an edge case.  
* One active countdown suffices for MVP.  
* Users are comfortable running `pip install -r requirements.txt` and `python app.py`.  
* No requirement for notifications, background processes, or multi-user features.

### Open questions

1. Do we need multiple named countdowns (tabs/list) in MVP, or is a single countdown acceptable?  
2. Should the app play an audible or visual alert when the countdown hits zero, and if so, what assets can ship offline?  
3. Is packaging into a standalone executable (e.g., PyInstaller) required, or are CLI instructions acceptable?  
4. Do users need to set a timezone different from their device locale for future events?

### Iteration readiness checklist

* MVP scope is bounded to a single countdown with local persistence and accuracy safeguards.  
* Required HTTP endpoints (`/`, `/api/time`, static assets) and contracts are defined.  
* Dependencies, tooling, and test strategy are selected and documented.  
* Risks include mitigation paths; outstanding product choices are captured as open questions.  
* Documentation updates (README, accessibility notes) are identified for implementation.
