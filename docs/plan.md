# Development (execution) plan

## Iteration 0 - PM alignment & architecture validation

*Spike / research*
- Review PRD/TDD open questions with stakeholder: multiple countdown support, zero-time alerts, packaging expectations, timezone override.
- Confirm acceptance criteria for accuracy (+/- 1s over 24h) and accessibility checklist scope.

*Development setup*
- None; outcomes feed later iterations.

*Testing*
- N/A.

*Execution & debugging*
- Document decisions in PRD/TDD appendices and update plan accordingly.

## Iteration 1 - Project scaffolding & tooling

*Spike / research*
- Evaluate feasibility of local Day.js bundling (ESM vs UMD) and decide packaging (download minified copy, check licensing).

*Development*
- Initialize Python project structure (`app/`, `static/`, `templates/`).
- Add Flask entrypoint with placeholder route returning "Hello Countdown".
- Configure `pyproject.toml` with Flask, pytest, freezegun, ruff, black.
- Add `pre-commit` config hooking lint + format + tests.

*Testing*
- Add sanity pytest ensuring `/` returns 200.
- Validate lint/format pipeline runs cleanly.

*Execution & debugging*
- Run `pre-commit run --all-files`, fix issues.
- Verify app starts via `python app.py`.

## Iteration 2 - Baseline template & styling foundation

*Spike / research*
- Decide CSS strategy (vanilla vs utility helpers) within no-CDN constraint.
- Confirm semantic structure for accessibility (landmarks, aria-live usage).

*Development*
- Create base Jinja template with semantic layout (header, main, footer).
- Add static CSS file with global styles, typography, responsive layout scaffolding.
- Embed server UTC baseline in template context (`server_now_utc_ms`).

*Testing*
- Extend pytest to assert baseline value present in rendered HTML.
- Manual smoke test in browser for layout responsiveness.

*Execution & debugging*
- Fix CSS/HTML validation issues; ensure static assets served correctly.

## Iteration 3 - Countdown logic & validation

*Spike / research*
- Review Day.js parsing/timezone APIs; confirm strategy for UTC conversions and DST handling.

*Development*
- Bundle Day.js locally (with UTC/plugin if needed).
- Implement client JS module handling:
  - Form parsing and validation (future date check, label length).
  - Countdown ticker using `requestAnimationFrame` plus fallback.
  - Inline error messaging and `aria-live` updates.
- Add server `/api/time` endpoint returning JSON UTC timestamp.

*Testing*
- Backend pytest validating `/api/time` returns monotonically increasing timestamps (using freeze/unfreeze).
- JS unit tests (via Playwright or DOM harness) covering:
  - Future vs past validation.
  - Remaining time calculations vs mocked baseline.
  - Graceful handling of `fetch` failure to `/api/time`.

*Execution & debugging*
- Manual browser test: start countdown, observe live tick, watch console logs for drift.
- Profile CPU usage to ensure no runaway loops.

## Iteration 4 - Persistence & resilience

*Spike / research*
- Investigate `localStorage` availability detection and fallback patterns; confirm messaging copy with stakeholders.

*Development*
- Implement persistence layer using `localStorage` with try/catch fallback.
- Auto-resume countdown on page load when stored target valid.
- Add periodic `/api/time` resync (e.g., every 5 minutes) and focus regain recalculation.
- Provide user feedback when persistence unavailable.

*Testing*
- JS tests simulating stored countdown across reloads (Playwright scenario).
- Backend tests ensuring `/api/time` sets `Cache-Control: no-store`.
- Manual test toggling browser privacy settings if feasible.

*Execution & debugging*
- Confirm countdown accuracy after refresh and background tab recovery.

## Iteration 5 - Accessibility, polish, and documentation

*Spike / research*
- Run axe-core audit checklist; identify required ARIA tweaks.

*Development*
- Fine-tune keyboard navigation, focus states, and color contrast.
- Add "Time's up" state styling, optional copy reminding user to reset.
- Draft README covering setup, run, testing, and troubleshooting.
- Document optional `waitress` deployment instructions.

*Testing*
- Manual accessibility review (screen reader smoke, keyboard-only run).
- Run automated lint (ruff/black) and full pytest suite.
- Optional Playwright script verifying ARIA attributes.

*Execution & debugging*
- Address any audit findings; ensure documentation instructions reproducible on Windows/macOS/Linux.

## Iteration 6 - Release readiness & backlog triage

*Spike / research*
- Evaluate feasibility of nice-to-haves (alerts, multiple countdowns) based on stakeholder decisions from Iteration 0.

*Development*
- Polish logging, error handling, and finalize configuration defaults.
- Add versioning notes and changelog template.

*Testing*
- Final regression run (lint, tests, manual smoke).
- Prepare release checklist.

*Execution & debugging*
- Tag release candidate; gather user feedback; schedule backlog refinement session.

## Backlog / future enhancements

- Multi-countdown management UI with tabbing or list view.
- Alert system (audio/visual) with user-configurable assets.
- Timezone override selector and conversion helpers.
- Packaging the app via PyInstaller or similar for one-click launch.
- Dark/light theme toggle.

## Dependencies & coordination notes

- Stakeholder responses on open questions are blockers for scope finalization (Iteration 0).
- Accessibility review may require coordination with UX specialist.
- Browser automation resources (Playwright) need confirmation; if unavailable, adjust testing scope.
