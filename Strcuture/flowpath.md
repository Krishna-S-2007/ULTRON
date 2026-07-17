# ULTRON — Data Flow & Stage Breakdown

---

## FreeLLMAPI Integration & Routing (VPS)

Instead of using individual, model-specific SDKs (like `google-generativeai` or `openai`), ULTRON utilizes a unified OpenAI-compatible endpoint hosted via FreeLLMAPI on a VPS, mapped locally to `http://localhost:3001/v1`.

### Key Advantages:
1. **Lightweight Dependencies:** No heavy model SDK installations. Only standard HTTP client library (`httpx`) is needed.
2. **Model Flexibility & Fallbacks:** Seamlessly switch models (e.g. `gemini-1.5-flash`, `gpt-4o-mini`, `claude-3-5-sonnet`) simply by changing the `"model"` field in the JSON request body.
3. **VPS Routing:** The VPS service port (3001) will be tunneled locally so that code communicates with `localhost:3001`.

### Testing Model Selection:
Before processing stages, we will test the endpoint connectivity and query response with a simple verification script.

---

## How SSE Works (Read This First)

When frontend calls `GET /api/investigation/{id}/stream`, the backend holds the connection open and pushes JSON lines as events happen. Frontend never polls — it just listens.

```
Backend pushes → text/event-stream → Frontend consumes
```

Every stage below ends with one or more SSE pushes. The frontend reacts to each push immediately.

**Heartbeat — SSE Timeout Prevention:**
A full investigation can take 2+ minutes. HTTP proxies and browsers drop idle SSE connections. Every 8 seconds during any long-running operation, the backend pushes:
```json
{ "type": "heartbeat", "ts": 1721200000 }
```
Frontend ignores this. It purely keeps the connection alive. This is a 1-line async loop running alongside the main pipeline.

---

## Stage 0 — Investigation Bootstrap

**Triggered by:** `POST /api/investigate` with `{ "query": "..." }`

**What happens:**
1. Generate `investigation_id` (UUID4)
2. Create `InvestigationState` object in RAM with the query
3. Register it in the global `investigations` dict
4. Spin up a background asyncio task: `run_investigation(state)`
5. Return `{ "investigation_id": "..." }` to frontend immediately

**Data created:**
```python
InvestigationState(
  investigation_id = "abc-123",
  query = "Analyze Tesla battery system",
  status = "pending"
)
```

**Frontend transmission:** Single HTTP response. No SSE yet.

**Edge cases:**
- Empty query → reject with 400 before creating state
- Duplicate query in quick succession → each gets its own UUID, treated independently

---

## Stage 1 — Mission Planner

**Module:** `planner.py`

**Input:** `state.query` (raw user string)

**What happens:**
1. Send query to FreeLLMAPI endpoint (`http://localhost:3001/v1/chat/completions`) using a standard HTTP request (via `httpx`).
2. Supported fallback models can be chosen (e.g., `gemini-1.5-flash`, `gpt-4o-mini`, `claude-3-5-sonnet`) in case of failure.
3. LLM returns JSON with objective, strategy, prioritized search queries, and investigation dimensions.
4. Parse and validate the JSON.
5. Store into `state`.

**Data written to state:**
```python
state.objective   = "Investigate Tesla's 4680 battery cell technology"
state.strategy    = "Cover official, academic, and news sources"
state.search_queries = [
  "Tesla 4680 battery official specs",
  "Tesla battery IEEE research papers",
  "Tesla battery thermal management",
  "Tesla battery manufacturing cost",
  "Tesla battery recycling 2024"
]
state.dimensions  = ["technical", "academic", "commercial", "sustainability"]
```

**SSE pushed:**
```json
{
  "type": "planner",
  "objective": "Investigate Tesla's 4680 battery cell technology",
  "strategy": "Cover official, academic, and news sources",
  "queries": ["Tesla 4680 battery official specs", "..."],
  "dimensions": ["technical", "academic", "commercial", "sustainability"]
}
```

**Edge cases:**
- LLM returns malformed JSON → retry once with explicit format instruction → if still broken, use fallback: split query into 3 generic search terms
- LLM returns >5 queries → truncate to 5 (hard cap)
- LLM returns 0 queries → use raw user query as single search term

---

## Stage 2 — Tavily Search

**Module:** `search.py`

**Input:** `state.search_queries` (list, max 5 per iteration)

**What happens:**
1. Loop through each query sequentially (not parallel — avoids rate limit spikes)
2. Call Tavily with `include_raw_content=True`, `max_results=5`
3. Apply domain blocklist — filter out LinkedIn, Twitter, Facebook, etc.
4. Append results to `state.raw_results`
5. Wait 0.5s between queries

**Data written to state (per result):**
```python
state.raw_results.append({
  "url": "https://tesla.com/battery",
  "title": "Tesla 4680 Cell Technology",
  "content": "...(snippet, usually 200-500 chars)...",
  "raw_content": "...(full text if Tavily extracted it, else None)...",
  "score": 0.94,
  "query": "Tesla 4680 battery official specs",
  "iteration": 1
})
```

**SSE pushed (once per query):**
```json
{
  "type": "search",
  "query": "Tesla 4680 battery official specs",
  "results_count": 4,
  "iteration": 1
}
```

**Edge cases:**
- Tavily returns 0 results → log to timeline event, skip query, continue
- Tavily API error / timeout (10s) → retry once → if fails, skip query
- All results for a query are from blocked domains → emit timeline event "No usable sources for: {query}", continue

---

## Stage 3 — Agentic Decision Node

**Module:** `extractor.py`

**Input:** `state.raw_results` (from current iteration)

**The Decision Logic (this is the agentic moment):**

```
For each result in raw_results:

  IF domain is blocked:
      action = "blocked" → skip

  ELSE IF raw_content exists AND len > 300:
      action = "use_raw"  → use Tavily's own extraction

  ELSE IF len(content/snippet) > 300:
      action = "use_snippet" → use Tavily snippet directly

  ELSE:
      action = "fetch_jina" → GET r.jina.ai/{url} → get full markdown
```

**Data written to state (per result processed):**
```python
state.documents.append({
  "url": "https://tesla.com/battery",
  "title": "Tesla 4680 Cell Technology",
  "content": "...(final usable text)...",
  "source": "tavily_raw | tavily_snippet | jina",
  "iteration": 1
})
```

**SSE pushed (once per URL):**
```json
{
  "type": "decision",
  "url": "https://tesla.com/battery",
  "domain": "tesla.com",
  "action": "use_raw",
  "iteration": 1
}
```

**Edge cases:**
- Jina fetch times out (15s limit) → skip URL, emit timeline "Jina timeout: {url}"
- Jina returns empty/error page → skip URL
- Jina returns content < 100 chars (likely a redirect or error page) → skip URL
- All documents for iteration come back empty → proceed to Evidence Analyzer with what's available, confidenceAPIs:
- Tavily Search API (search + content)
- Jina Reader (r.jina.ai) — no key needed
- FreeLLMAPI Proxy (Unified API endpoint for Model Selection & Fallback)

---

## Stage 4 — Evidence Analyzer + Gap Detector

**Module:** `evidence_analyzer.py`

**Input:** `state.documents` (all docs collected so far across iterations)

**What happens:**
Single FreeLLMAPI call using the reasoning model (`nemotron-3-nano-30b-reasoning`) with all document content. System prompt instructs LLM to return structured JSON with analysis AND missing topics in one response. No second LLM call for gaps.

**Deduplication (built into system prompt):**
The prompt explicitly instructs: *"Deduplicate facts. If the same fact appears in multiple sources, record it once and list all corroborating sources in the `sources` array."* This prevents the same fact from appearing 5 times just because 5 sources mentioned it.

**Authority Scoring Heuristics (provided to LLM in prompt):**
The LLM cannot guess authority on its own. The system prompt includes this rubric:
```
High authority  → .gov, .edu, .org (established), major news outlets
                   (reuters.com, bbc.com, nytimes.com, techcrunch.com)
Medium authority → Industry blogs, company press releases, Wikipedia
Low authority   → Unknown domains, personal blogs, forums, undated articles

For each source: check for author credentials, citations, publication date.
Authority affects confidence.authority score directly.
```

**Data written to state:**
```python
state.evidence = [
  {
    "fact": "4680 cells use tabless design",
    "sources": ["tesla.com", "ieee.org"],   # deduplicated
    "authority": "high"
  },
  ...
]
state.claims = ["Tesla claims 16% range increase", ...]
state.contradictions = ["Reuters says cost is $X, Tesla says $Y"]
state.missing_topics = ["battery recycling", "thermal runaway safety"]
state.knowledge_coverage = {
  "official": 85, "academic": 55, "news": 70, "blogs": 10
}
state.confidence = {
  "overall": 74, "authority": 88, "agreement": 72,
  "coverage": 65, "recency": 80, "contradictions_penalty": 8
}
```

**After analysis: raw documents are cleared from memory**
```python
state.documents = []   # free memory, evidence is all we need
```

**SSE pushed (multiple events):**
```json
{ "type": "evidence", "facts_count": 14, "claims_count": 8, "contradictions": 2, "iteration": 1 }
{ "type": "confidence", "overall": 74, "authority": 88, "agreement": 72, "coverage": 65, "recency": 80 }
{ "type": "coverage", "official": 85, "academic": 55, "news": 70, "blogs": 10 }
{ "type": "gap", "missing": ["battery recycling", "thermal runaway safety"] }
{ "type": "timeline", "message": "Iteration 1 complete. Confidence: 74%. 2 knowledge gaps found." }
```

**Edge cases:**
- LLM returns malformed JSON → retry once with explicit schema → if fails, mark `missing_topics = []`, `confidence.overall = 50`, continue to report
- Evidence from documents is too large for LLM context → chunk documents (3000 tokens each), run analyzer per chunk, merge fact lists, take lowest confidence score
- All evidence contradicts itself → confidence penalty applied, `contradictions` list populated, report highlights this explicitly

---

## Stage 5 — Loop Controller + Query Generator

**Location:** `main.py` (orchestrator logic, not a separate module)

**Decision logic:**

```python
if len(state.missing_topics) == 0 or state.confidence["overall"] >= 80:
    → BREAK → go to Stage 6 (Report)

elif state.iteration >= 3:
    → BREAK → go to Stage 6 (Report) with current evidence

else:
    state.iteration += 1
    state.search_queries = await generate_queries_from_gaps(state)
    → LOOP BACK to Stage 2
```

**Query Generation from Gaps — explicit LLM call:**
`generate_queries_from(missing_topics)` is NOT a utility function — it is a lightweight FreeLLMAPI call using `gemini-3.5-flash`:
```
System: You are a search query generator.
Given:
  - Investigation objective: {state.objective}
  - Already searched: {state.search_queries so far}
  - Missing topics: {state.missing_topics}

Generate 3-5 targeted search queries to fill the gaps.
Do not repeat previously used queries.
Return JSON: { "queries": [...] }
```
This call takes ~3-5 seconds. It ensures new queries are specific to gaps, not generic repetitions. This is intentionally the cheapest possible model call — short prompt, short output, structured JSON.

**SSE pushed (only if looping):**
```json
{
  "type": "loop",
  "iteration": 2,
  "reason": "Knowledge gaps found: battery recycling, thermal runaway safety",
  "new_queries": ["Tesla battery recycling process", "Tesla battery thermal runaway tests"]
}
```

**Edge cases:**
- Iteration 3 completes but confidence still < 80 → proceed to report anyway, report's Limitations section will note this
- Gap query LLM returns malformed JSON → fallback: turn each `missing_topic` string directly into a search query as-is
- Gap query LLM returns queries that are identical to previous iteration's queries → deduplicate before searching

---

## Stage 6 — Final Report Generator

**Module:** `report_generator.py`

**Input:**
- `state.evidence`, `state.claims`, `state.contradictions`
- `state.confidence`, `state.knowledge_coverage`
- `state.missing_topics` (remaining unresolved)
- `state.objective`, `state.strategy`

**What happens:**
1. Single FreeLLMAPI call using the super intelligence model (`nemotron-3-super-120b`) with full evidence summary and confidence data
2. LLM generates structured markdown report
3. Report saved to `reports/{investigation_id}.md` on disk
4. `state.final_report` set to file path
5. `state.status` = `"completed"`

**Report sections generated:**
```
Executive Summary | Investigation Objectives | Evidence Used
Evidence Rejected | Key Findings | Supporting Sources
Conflicting Sources | Confidence Analysis | Knowledge Coverage
Limitations | Recommendations | Final Conclusion
```

**SSE pushed:**
```json
{ "type": "timeline", "message": "Generating final report..." }
{ "type": "report", "status": "completed" }
```

**After this SSE push, the stream connection closes.**
Frontend shows "Open Report" button → calls `GET /api/report/{id}` → returns the markdown file content.

**Edge cases:**
- Report LLM call fails → retry once → if fails, generate a minimal report from raw evidence list in Python (no LLM), still save and complete
- Report file write fails (disk full, permissions) → return report as string in the "report" SSE event itself as fallback

---

## Complete Data Flow Summary

```
POST /investigate
      │
      ▼
  InvestigationState (RAM)
      │
      ▼
  [Stage 1] Planner ──────────────────────► SSE: "planner"
      │
      ▼
  [Stage 2] Tavily Search ────────────────► SSE: "search" (per query)
      │
      ▼
  [Stage 3] Decision Node ────────────────► SSE: "decision" (per URL)
      │
      ▼
  [Stage 4] Evidence Analyzer ────────────► SSE: "evidence", "confidence",
      │        + Gap Detector                       "coverage", "gap"
      │
      ▼
  [Stage 5] Loop Controller
      │  gaps + iter < 3? ──────────────► Loop back to Stage 2
      │  done?
      ▼
  [Stage 6] Report Generator ─────────────► SSE: "report" (stream closes)
      │
      ▼
  GET /api/report/{id} ───────────────────► raw markdown string
```

---

## Memory Lifecycle

| Object | Created | Cleared |
|---|---|---|
| `InvestigationState` | Stage 0 | Lives until server restart |
| `raw_results` | Stage 2 | Replaced each iteration |
| `documents` | Stage 3 | Cleared after Stage 4 runs |
| `evidence / claims` | Stage 4 | Accumulates across all iterations |
| `final_report` (in RAM) | Stage 6 | Just a file path string |
| `.md` file on disk | Stage 6 | Persists indefinitely |

---

## What Frontend Needs to Handle

| SSE Event | Frontend Action |
|---|---|
| `planner` | Show objective + render search query list |
| `search` | Add query chip to "Live Searches" panel |
| `decision` | Add URL card with action badge (snippet/jina/blocked) |
| `evidence` | Update evidence counts |
| `confidence` | Update confidence ring + sub-scores |
| `coverage` | Update knowledge coverage progress bars |
| `gap` | Show "Knowledge Gap Found" banner + new topics |
| `loop` | Show "Searching Again... Iteration {n}" indicator |
| `timeline` | Append timestamped message to Investigation Timeline |
| `report` | Enable "Open Report" button |
| `heartbeat` | **Ignore completely** — just proves connection is alive |
| `error` | Show error state, allow retry |
