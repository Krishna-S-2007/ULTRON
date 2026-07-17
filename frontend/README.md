# IntelDesk — Autonomous AI Investigation Workspace

A frontend-only scaffold for an enterprise AI investigation platform. Every backend
call is mocked; the whole app runs immediately with dummy data.

## Run it

```bash
npm install
npm run dev
```

Open the printed localhost URL. Click **Start Investigation** on the home screen
(or pick one of the example objectives) to see the full dashboard, live activity
feed, and report panel.

## Stack

React 19 + Vite + TypeScript · TailwindCSS · shadcn/ui-style primitives on Radix ·
Framer Motion · Lucide icons · react-markdown · react-router-dom.

## Structure

```
src/
  components/
    layout/           Sidebar, Navbar
    investigation/     All dashboard sections (pipeline, evidence, trust metrics,
                        audit timeline, contradictions, explainability,
                        executive summary, coverage, limitations, report panel,
                        live activity feed)
    ui/                shadcn-style primitives (button, card, badge, progress,
                        accordion, tabs, scroll-area)
    common/            ConfidenceRing (signature element), skeletons, empty state
  pages/               Home, Dashboard, Investigations, Reports, Settings
  services/api.ts      Mock API layer — see below
  hooks/useInvestigationStream.ts    Folds live events into UI state
  types/investigation.ts             Shared domain types (the real contract)
  data/mockData.ts     All dummy JSON, as typed TS objects
```

## Backend integration

`src/services/api.ts` is the only file that should change when the real backend
is ready. Each exported function is commented with the endpoint it stands in for:

- `startInvestigation()` -> `POST /api/investigate`
- `getInvestigation()`, `getEvidence()`, `getAuditTrail()`, `getMetrics()`,
  `getContradictions()`, `getExplainability()` -> `GET /api/investigation/{id}/...`
- `getReport()` -> `GET /api/report/{id}`
- `streamInvestigation()` -> `GET /api/investigation/{id}/stream` (SSE, WebSocket
  fallback). Replace the mock timer-based generator with a real `EventSource`
  (or WebSocket) that calls the same `onEvent(event: LiveEvent)` callback and
  returns a cleanup function.

`src/types/investigation.ts` defines the `LiveEvent` union (`planner`, `search`,
`url`, `browser`, `stage`, `confidence`, `gap`, `timeline`, `report`) — shape the
real SSE payloads to match this and no component code needs to change.

## Design notes

- Dark theme, Inter type, blue accent (#3B82F6) on near-black (#09090B), per the
  brief. `tailwind.config.js` centralizes every token.
- The **ConfidenceRing** (`components/common/ConfidenceRing.tsx`) is the
  signature visual element — a precision measurement ring rather than a stock
  progress bar, with a "signal lock" pulse once confidence crosses 70%.
- The home screen background is an ambient, low-opacity signal graphic, echoing
  "extracting a clean signal from noisy sources" — the product's core value prop —
  rather than decorative art.
- No chat UI anywhere, per the brief: investigation objectives are entered once,
  and all subsequent state is visualized, not conversed with.
