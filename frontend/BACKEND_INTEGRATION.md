# IntelDesk Frontend — Backend Integration Guide

> **Purpose**: Complete reference for every component, API contract, data type, and wiring
> point in the IntelDesk frontend. Treat this as the single source of truth when building
> or connecting the backend.

---

## Table of Contents

1. [Project Structure](#1-project-structure)
2. [Data Types Contract](#2-data-types-contract)
3. [API Layer](#3-api-layer)
4. [Live Event Stream Protocol](#4-live-event-stream-protocol)
5. [Pages](#5-pages)
6. [Investigation Components](#6-investigation-components)
7. [Layout Components](#7-layout-components)
8. [Background AnimatedRibbon](#8-background--animatedribbon)
9. [Investigation State Machine](#9-investigation-state-machine)
10. [Integration Checklist](#10-integration-checklist)

---

## 1. Project Structure

```
src/
├── App.tsx                           ← Router + InvestigationStateProvider + AnimatedRibbon
├── main.tsx                          ← React root
├── index.css                         ← Global styles + Tailwind
│
├── context/
│   └── InvestigationStateContext.tsx ← Ribbon state broadcast (idle→planning→…→completed)
│
├── pages/
│   ├── Home.tsx                      ← Investigation launcher (POST /api/investigate)
│   ├── Dashboard.tsx                 ← Main investigation view (all GET + SSE stream)
│   ├── InvestigationsPage.tsx        ← Investigation list
│   ├── ReportsPage.tsx               ← Report list
│   └── SettingsPage.tsx              ← Settings
│
├── components/
│   ├── background/
│   │   └── AnimatedRibbon.tsx        ← Canvas 2D animated ribbon background
│   ├── investigation/                ← All dashboard widgets (12 components)
│   ├── layout/
│   │   ├── Navbar.tsx
│   │   └── Sidebar.tsx
│   ├── common/
│   │   ├── ConfidenceRing.tsx
│   │   ├── EmptyState.tsx
│   │   └── LoadingSkeleton.tsx
│   └── ui/                           ← Radix-based design primitives
│
├── hooks/
│   └── useInvestigationStream.ts     ← SSE/WS event consumer hook
│
├── services/
│   └── api.ts                        ← ALL backend calls (currently mocked — replace these)
│
├── types/
│   └── investigation.ts              ← Complete TypeScript domain model
│
└── data/
    └── mockData.ts                   ← Mock fixtures (delete or stub out in production)
```

---

## 2. Data Types Contract

> File: src/types/investigation.ts
>
> Every API response MUST conform to these shapes. No component code needs to change
> if your backend returns exactly these types.

### Core Enums

```ts
type InvestigationType   = "company" | "person" | "event" | "topic";
type InvestigationStatus = "running" | "completed" | "failed" | "paused";
type StageStatus         = "pending" | "running" | "completed" | "failed";
type VerificationStatus  = "verified" | "pending" | "rejected";
type SourceType          = "news" | "government" | "academic" | "company"
                         | "social" | "blog" | "court_record" | "industry_report";
type RiskLevel           = "low" | "medium" | "high";
```

### Investigation

```ts
interface PipelineStage {
  id:           string;       // e.g. "scope" | "discovery" | "validation" | "conflict" | "reasoning" | "report"
  label:        string;       // Display name e.g. "Scope Definition"
  status:       StageStatus;
  startedAt?:   string;       // ISO 8601
  completedAt?: string;       // ISO 8601
  detail?:      string;       // Optional status detail
}

interface Investigation {
  id:         string;
  objective:  string;         // The user investigation question
  type:       InvestigationType;
  status:     InvestigationStatus;
  createdAt:  string;         // ISO 8601
  confidence: number;         // 0–100
  stages:     PipelineStage[];
}
```

### Evidence

```ts
interface EvidenceItem {
  id:           string;
  sourceName:   string;       // e.g. "Reuters", "SEC EDGAR"
  sourceType:   SourceType;
  url:          string;
  credibility:  number;       // 0–100
  publishedAt:  string;       // ISO 8601
  verification: VerificationStatus;
  confidence:   number;       // 0–100
  excerpt?:     string;       // Optional short quote from source
}
```

### Trust Metrics

```ts
interface TrustMetric {
  id:          string;
  label:       string;        // e.g. "Source Diversity"
  value:       number;        // 0–100
  description: string;
}
```

### Audit Trail

```ts
interface AuditEvent {
  id:        string;
  timestamp: string;
  message:   string;
  kind:      "info" | "success" | "warning" | "error";
}
```

### Contradiction

```ts
interface Contradiction {
  id:                string;
  claimA:            { text: string; source: string };
  claimB:            { text: string; source: string };
  resolution:        string;
  updatedConfidence: number;
}
```

### Explainability

```ts
interface ExplainabilitySection {
  id:                       string;
  question:                 string;
  evidenceUsed:             string[];
  reasoningSteps:           string[];
  alternativePossibilities: string[];
  confidence:               number;
  limitations:              string[];
}
```

### Report

```ts
interface ExecutiveSummary {
  summary:            string;
  confidence:         number;
  keyFindings:        string[];
  riskLevel:          RiskLevel;
  recommendedActions: string[];
}

interface CoverageItem {
  id:       string;
  label:    string;
  complete: boolean;
}

interface Limitation {
  id:   string;
  text: string;
}

interface InvestigationReport {
  investigationId: string;
  generatedAt:     string;        // ISO 8601
  executiveSummary: ExecutiveSummary;
  coverage:         CoverageItem[];
  limitations:      Limitation[];
  markdown:         string;       // Full markdown report text
}
```

---

## 3. API Layer

> File: src/services/api.ts
>
> Every function is currently mocked. Replace each function body with a real
> fetch/axios call. Keep function signatures and return types identical — no
> component code needs to change.

### startInvestigation(objective, type)

Endpoint: POST /api/investigate
Request body: { query: string, type: InvestigationType }
Response: { investigationId: string }
Used by: Home.tsx — triggered on "Start Investigation" button click.

```ts
export async function startInvestigation(
  objective: string,
  type: InvestigationType
): Promise<{ investigationId: string }> {
  const res = await fetch("/api/investigate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: objective, type }),
  });
  return res.json();
}
```

---

### getInvestigation(id)

Endpoint: GET /api/investigation/{id}
Response: Investigation
Used by: Dashboard.tsx — initial seed load.

```ts
export async function getInvestigation(id: string): Promise<Investigation> {
  const res = await fetch(`/api/investigation/${id}`);
  return res.json();
}
```

---

### getEvidence(id)

Endpoint: GET /api/investigation/{id}/evidence
Response: EvidenceItem[]
Used by: Dashboard.tsx → EvidencePanel

```ts
export async function getEvidence(id: string): Promise<EvidenceItem[]> {
  const res = await fetch(`/api/investigation/${id}/evidence`);
  return res.json();
}
```

---

### getAuditTrail(id)

Endpoint: GET /api/investigation/{id}/audit
Response: AuditEvent[]
Used by: Dashboard.tsx → AuditTimeline

NOTE: Dashboard currently slices audit to [] on initial load and drives the timeline
exclusively from live stream events. Remove audit.slice(0, 0) in Dashboard.tsx
line 80 to also show historical audit events from REST.

```ts
export async function getAuditTrail(id: string): Promise<AuditEvent[]> {
  const res = await fetch(`/api/investigation/${id}/audit`);
  return res.json();
}
```

---

### getMetrics(id)

Endpoint: GET /api/investigation/{id}/metrics
Response: TrustMetric[]
Used by: Dashboard.tsx → TrustMetrics

Suggested metric IDs:
  "src-diversity" / "cross-verify" / "recency" / "authority"

```ts
export async function getMetrics(id: string): Promise<TrustMetric[]> {
  const res = await fetch(`/api/investigation/${id}/metrics`);
  return res.json();
}
```

---

### getContradictions(id)

Endpoint: GET /api/investigation/{id}/contradictions
Response: Contradiction[]
Used by: Dashboard.tsx → ContradictionCard (shows only contradictions[0])

```ts
export async function getContradictions(id: string): Promise<Contradiction[]> {
  const res = await fetch(`/api/investigation/${id}/contradictions`);
  return res.json();
}
```

---

### getExplainability(id)

Endpoint: GET /api/investigation/{id}/explainability
Response: ExplainabilitySection[]
Used by: Dashboard.tsx → ExplainabilityPanel

```ts
export async function getExplainability(id: string): Promise<ExplainabilitySection[]> {
  const res = await fetch(`/api/investigation/${id}/explainability`);
  return res.json();
}
```

---

### getReport(id)  ← Called AFTER stream completes

Endpoint: GET /api/report/{id}
Response: InvestigationReport
Used by: Dashboard.tsx — called only AFTER stream emits { type: "report", status: "completed" }

```ts
export async function getReport(id: string): Promise<InvestigationReport> {
  const res = await fetch(`/api/report/${id}`);
  return res.json();
}
```

---

### streamInvestigation(id, onEvent)  ← MOST CRITICAL

Endpoint: GET /api/investigation/{id}/stream  (SSE)
Consumed by: src/hooks/useInvestigationStream.ts

Replace the mock timer with a real EventSource:

```ts
export function streamInvestigation(
  investigationId: string,
  onEvent: (event: LiveEvent) => void
): () => void {
  const source = new EventSource(`/api/investigation/${investigationId}/stream`);
  source.onmessage = (e) => {
    const event: LiveEvent = JSON.parse(e.data);
    onEvent(event);
  };
  return () => source.close();
}
```

---

## 4. Live Event Stream Protocol

> Hook: src/hooks/useInvestigationStream.ts

The SSE stream must emit JSON objects matching the LiveEvent union below.
Each message should be sent as:  data: <json>\n\n

### Event Types Summary

| type        | Effect on UI                                      |
|-------------|---------------------------------------------------|
| planner     | Row in LiveActivityFeed                           |
| search      | Row in LiveActivityFeed                           |
| url         | Row in LiveActivityFeed (colour = verification)   |
| browser     | Row in LiveActivityFeed                           |
| stage       | Updates ExecutionPipeline + ribbon state          |
| confidence  | Updates ConfidenceRing value                      |
| gap         | Shows amber banner in LiveActivityFeed            |
| timeline    | Adds entry to AuditTimeline                       |
| report      | Triggers GET /api/report/:id — show all panels    |

### Event Shapes

```ts
type LiveEvent =
  | { type: "planner";    task: string;   timestamp: string }
  | { type: "search";     query: string;  timestamp: string }
  | { type: "url";        url: string; domain: string; status: "verified"|"pending"|"rejected"; timestamp: string }
  | { type: "browser";    url: string;    timestamp: string }
  | { type: "stage";      stageId: string; status: "pending"|"running"|"completed"|"failed"; timestamp: string }
  | { type: "confidence"; value: number;  timestamp: string }   // value: 0–100
  | { type: "gap";        message: string; timestamp: string }
  | { type: "timeline";   message: string; kind: "info"|"success"|"warning"|"error"; timestamp: string }
  | { type: "report";     status: "completed"; timestamp: string };
```

### Required Stage IDs (for stage events)

These must match the PipelineStage.id values in GET /api/investigation/{id}:

  scope       → triggers ribbon state: searching (default)
  discovery   → triggers ribbon state: searching
  validation  → triggers ribbon state: verifying
  conflict    → triggers ribbon state: reasoning
  reasoning   → triggers ribbon state: reasoning
  report      → triggers ribbon state: report

Mapping is in Dashboard.tsx: function stageToRibbonState(stageId: string)
Update that function if your stage IDs differ.

### Expected Stream Order

```
planner
stage(scope, running)
timeline
stage(scope, completed)
stage(discovery, running)
search × N
url × N
timeline
stage(discovery, completed)
stage(validation, running)
browser × N
confidence × N
stage(validation, completed)
stage(conflict, running)
gap?  (optional)
timeline
confidence
stage(conflict, completed)
stage(reasoning, running)
timeline
confidence
stage(reasoning, completed)
stage(report, running)
timeline
stage(report, completed)
report(completed)   ← this triggers getReport() call on frontend
```

---

## 5. Pages

### Home.tsx  (Route: /)

Renders the investigation launcher. On "Start Investigation" click:
  startInvestigation(objective, type) → navigate to /investigations/:id

No additional wiring needed once startInvestigation() returns a real investigationId.

---

### Dashboard.tsx  (Route: /investigations/:id)

Main investigation view. On mount fires 6 parallel API calls, then subscribes to SSE stream.
Also broadcasts current stage to AnimatedRibbon via InvestigationStateContext.

Data loaded in parallel:
  getInvestigation(id)
  getEvidence(id)
  getMetrics(id)
  getAuditTrail(id)       ← currently sliced to [] — see note above
  getContradictions(id)
  getExplainability(id)

Report loaded when stream completes:
  if (reportReady) getReport(id).then(setReport)

---

## 6. Investigation Components

All components are in src/components/investigation/.
They are pure display components — they receive data as props and render it.
No component makes API calls directly.

---

### InvestigationHeader

Props: { investigation: Investigation }

Displays: Status badge, investigation ID, type, objective (h1), created timestamp,
          ConfidenceRing (animated circular meter, 0–100).

Backend notes:
- confidence field is updated live via { type: "confidence", value: N } stream events
- status changes to "completed" when { type: "report", status: "completed" } arrives

---

### ExecutionPipeline

Props: { stages: PipelineStage[] }

Displays: Horizontal step-tracker with status icons and connector lines.

Status visuals:
  pending   → grey ring + Circle icon
  running   → blue ring + Spinning Loader icon
  completed → green ring + Check icon
  failed    → red ring + X icon

Backend notes:
- stages array initialised with all stages at status: "pending"
- Each { type: "stage", stageId, status } stream event updates the matching stage
- Stage IDs in stream MUST match PipelineStage.id values from GET /api/investigation/{id}

---

### EvidencePanel

Props: { evidence: EvidenceItem[] }

Displays: Filterable grid of evidence cards (All / Verified / Pending / Rejected tabs).

Each card shows: source name, type icon, excerpt, verification badge,
                 credibility %, confidence %, published date, clickable URL.

Backend notes:
- Populated once from GET /api/investigation/{id}/evidence
- sourceType controls the icon. Valid values:
  news, government, academic, company, social, blog, court_record, industry_report

---

### LiveActivityFeed

Props: { events: LiveEvent[] }

Displays: Real-time scrollable feed of agent actions.

Event → Feed row mapping:
  planner  → Compass icon, indigo colour
  search   → Search icon, blue colour
  url      → Globe icon, green/red/amber by verification status
  browser  → Globe icon, info-blue colour
  gap      → RotateCcw spinning icon, amber colour + sticky banner

Note: timeline, stage, confidence, report events are silently ignored here.
      Rows appear newest-first (reversed array).

---

### TrustMetrics

Props: { metrics: TrustMetric[] }

Displays: Row of labelled progress bars.

Suggested metrics:
  { id:"src-diversity",  label:"Source Diversity",        value:82 }
  { id:"cross-verify",   label:"Cross-verification Rate", value:75 }
  { id:"recency",        label:"Recency Score",           value:68 }
  { id:"authority",      label:"Authority Index",         value:91 }

---

### AuditTimeline

Props: { events: AuditEvent[] }

Displays: Chronological timeline of audit entries with kind badges.

Backend notes:
- Live entries come from { type: "timeline", message, kind, timestamp } stream events
- Historical entries from GET /api/investigation/{id}/audit
- Combined array: [...baseAudit, ...auditTrail]
- Remove audit.slice(0,0) on Dashboard.tsx line 80 to show historical entries

---

### ContradictionCard

Props: { contradiction: Contradiction }

Displays: Two conflicting claims, their sources, AI resolution, updated confidence.

Backend notes:
- Dashboard renders only contradictions[0]
- To show multiple contradictions, update Dashboard.tsx to map over the array

---

### ExplainabilityPanel

Props: { sections: ExplainabilitySection[] }

Displays: Accordion — one item per section, each shows:
  evidence used, reasoning steps, alternatives, confidence %, limitations.

---

### ExecutiveSummaryCard

Props: { summary: ExecutiveSummary; onOpenReport: () => void }

Displays: Summary paragraph, confidence score, risk badge (low/medium/high),
          key findings, recommended actions, "View Full Report" button.

Backend notes:
- Only rendered after reportReady === true (stream emits report event)
- Risk level badge colours: low → green, medium → amber, high → red

---

### CoverageChecklist

Props: { items: CoverageItem[] }

Displays: Checklist of investigation coverage areas.

Suggested items: Financial data, Legal filings, News coverage,
                 Social sentiment, Academic research, Government records.

---

### LimitationsCard

Props: { limitations: Limitation[] }

Displays: Bulleted list of known investigation limitations.

---

### ReportPanel

Props: { report: InvestigationReport | null; open: boolean; onClose: () => void }

Displays: Slide-in side panel from right edge, renders report.markdown via react-markdown.
          Has a Download button (currently UI only — needs wiring).

Wire the Download button:
```ts
const blob = new Blob([report.markdown], { type: "text/markdown" });
const url = URL.createObjectURL(blob);
const a = document.createElement("a");
a.href = url;
a.download = `report-${report.investigationId}.md`;
a.click();
```

---

## 7. Layout Components

### Navbar

Props: { investigationLabel?: string }

Shows: page title, search input (unwired), notifications bell (unwired), user menu (unwired).

Backend wiring needed:
  Search:        GET /api/investigations?q={query}
  Notifications: GET /api/notifications or WebSocket
  User info:     GET /api/user/me

---

### Sidebar

Static navigation links. No backend calls needed.

Optional: add investigation count badges via GET /api/investigations/count.

---

## 8. Background — AnimatedRibbon

File: src/components/background/AnimatedRibbon.tsx

Pure Canvas 2D animation. Receives one prop:

```ts
type InvestigationState =
  | "idle"       // calm slow breathing motion
  | "planning"   // strands converge, more structured
  | "searching"  // blue pulse travels left→right
  | "verifying"  // white highlight sweep
  | "reasoning"  // strands align, intentional motion
  | "report"     // brighter, richer highlights
  | "completed"  // returns to calm, stable glow

interface AnimatedRibbonProps {
  state?: InvestigationState;
}
```

State flow:
  InvestigationStateContext
    ↑                        ↓
  Dashboard.tsx sets state   App.tsx reads state → passes to AnimatedRibbon
  via setInvestigationState()
  on each stream stage event

To set state from anywhere:
```ts
import { useInvestigationState } from "@/context/InvestigationStateContext";
const { setInvestigationState } = useInvestigationState();
setInvestigationState("searching");
```

---

## 9. Investigation State Machine

```
User submits objective
        │
        ▼
POST /api/investigate  →  { investigationId }
        │
        ▼
Navigate to /investigations/:id
        │
        ▼
Dashboard mounts — fires 6 parallel GETs (see Phase 1 checklist)
        │
        ▼
useInvestigationStream subscribes to SSE stream
        │
        ▼ stream events drive all widgets:
  stage       → ExecutionPipeline + ribbon state context
  search      → LiveActivityFeed
  url         → LiveActivityFeed
  browser     → LiveActivityFeed
  planner     → LiveActivityFeed
  gap         → LiveActivityFeed (amber banner)
  confidence  → InvestigationHeader ConfidenceRing
  timeline    → AuditTimeline
  report      → GET /api/report/:id → ExecutiveSummary + Coverage + Limitations + ReportPanel
```

---

## 10. Integration Checklist

### Phase 1 — REST Endpoints

- [ ] POST /api/investigate                          returns { investigationId: string }
- [ ] GET  /api/investigation/{id}                   returns Investigation with all stages
- [ ] GET  /api/investigation/{id}/evidence          returns EvidenceItem[]
- [ ] GET  /api/investigation/{id}/metrics           returns TrustMetric[]
- [ ] GET  /api/investigation/{id}/audit             returns AuditEvent[]
- [ ] GET  /api/investigation/{id}/contradictions    returns Contradiction[]
- [ ] GET  /api/investigation/{id}/explainability    returns ExplainabilitySection[]
- [ ] GET  /api/report/{id}                          returns InvestigationReport

### Phase 2 — SSE Stream

- [ ] GET /api/investigation/{id}/stream             SSE endpoint open
- [ ] Emits all LiveEvent types in correct order
- [ ] stage events use IDs matching PipelineStage.id from Phase 1
- [ ] Final event is always { type: "report", status: "completed" }
- [ ] Stream closes cleanly after report event

### Phase 3 — Wire services/api.ts

- [ ] Replace startInvestigation() body
- [ ] Replace getInvestigation() body
- [ ] Replace getEvidence() body
- [ ] Replace getMetrics() body
- [ ] Replace getAuditTrail() body
- [ ] Replace getContradictions() body
- [ ] Replace getExplainability() body
- [ ] Replace getReport() body
- [ ] Replace streamInvestigation() with real EventSource

### Phase 4 — Clean Up Mocks

- [ ] Delete or keep src/data/mockData.ts for tests
- [ ] Remove audit.slice(0, 0) from Dashboard.tsx line 80 if using historical audit
- [ ] Remove MOCK_LATENCY_MS delay from api.ts

### Phase 5 — Remaining UI Wiring

- [ ] ReportPanel Download button → blob download or GET /api/report/{id}/download
- [ ] Navbar search bar → GET /api/investigations?q={query}
- [ ] InvestigationsPage → GET /api/investigations
- [ ] ReportsPage → GET /api/reports
- [ ] SettingsPage → GET/PATCH /api/user/settings

### Phase 6 — Auth and Error Handling

- [ ] Add auth headers to all fetch calls in api.ts
- [ ] Handle loading and error states (skeleton loader already exists in Dashboard)
- [ ] Handle SSE reconnection on connection drop

---

> TIP: Every integration point has a // BACKEND: comment in the source.
> Run this to find all 14 wiring locations instantly:
>
>   grep -rn "BACKEND" src/
