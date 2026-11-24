# LokaTalenta 3D Office HQ

Dedicated 3-floor interactive Three.js 3D headquarters (`PORT=4105`) decoupled from [`zixew/lokatalenta`](https://github.com/zixew/lokatalenta) (`docs/kantor_ai_3d.html`), featuring 7 enterprise zones, animated elevator, 3 POV modes (`overview`, `third-person`, `first-person`), 24 articulated agents across 6 divisions, and live WebSocket / SSE telemetry via [`lokatalenta-event-gateway`](https://github.com/zixew/lokatalenta-event-gateway).

## Repository Layout

- `index.html` / `kantor_ai_3d.html` — Initial extracted standalone 3D Office baseline (prior to M5 Vite + TypeScript modularization into `src/`)
- `public/` — Static assets (planned M5)
- `tests/` — Unit tests (planned M5)
- `e2e/` — End-to-end Playwright & telemetry integration suite

## Ecosystem Siblings

| Repository | Role | Default Port |
| --- | --- | --- |
| [`zixew/lokatalenta`](https://github.com/zixew/lokatalenta) | Core LMS Psikotes (`lms-psikotes`) | `4100` |
| [`zixew/lokatalenta-event-gateway`](https://github.com/zixew/lokatalenta-event-gateway) | Real-Time Event Gateway & Canonical Contracts | `4101` |
| [`zixew/lokatalenta-backlog`](https://github.com/zixew/lokatalenta-backlog) | Backlog & Grooming Management | `4102` (API) / `4112` (UI) |
| [`zixew/lokatalenta-sprint-planner`](https://github.com/zixew/lokatalenta-sprint-planner) | Sprint Planning & Capacity | `4103` (API) / `4113` (UI) |
| [`zixew/lokatalenta-docs`](https://github.com/zixew/lokatalenta-docs) | Architecture, ADRs, Contracts & Rubrics | `4104` (API) / `4114` (UI) |

## Commands (Planned M5 Baseline)

```bash
npm install
npm run dev   # Port 4105
npm test
```

> During M1 extraction, open `index.html` (or serve the repository root over HTTP) to launch the baseline 24-agent 3D Office.
