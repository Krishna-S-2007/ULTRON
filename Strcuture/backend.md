# ULTRON - Explainable Autonomous OSINT Investigation Agent

## Vision

ULTRON is an Explainable Autonomous Investigation Agent.

Unlike traditional AI chatbots that immediately answer a question, ULTRON performs a transparent investigation, explains every decision it makes, verifies evidence from multiple sources, continuously identifies knowledge gaps, and generates a trustworthy report with confidence metrics.

The objective is not simply to answer questions but to demonstrate autonomous planning, intelligent tool usage, explainability, and iterative reasoning.

---

# Core Principles

1. Plan before acting.
2. Search multiple independent sources.
3. Never trust a single source.
4. Only fetch full content when snippets are not enough. (Agentic Decision)
5. Detect missing knowledge automatically.
6. Continue investigation until confidence threshold is reached — hard capped at 3 iterations.
7. Explain every decision to the user via SSE events.

---

# Overall Pipeline (Finalized)

```
User Query
   ↓
[1] Mission Planner (Gemini Flash)
   ↓
[2] Tavily Search (per query, max 5 results)
   ↓
[3] Agentic Decision Node  ← Key differentiator
       Tavily snippet sufficient? (>300 chars)
           YES → use snippet directly
           NO  → fetch via Jina Reader (r.jina.ai/{url})
   ↓
[4] Evidence Analyzer (Gemini Flash)
       Extracts: facts, claims, contradictions,
       confidence scores, missing_topics  ← combined in one call
   ↓
[5] Gap Check (built into step 4 output)
       missing_topics empty AND confidence >= threshold?
           YES → Final Report
           NO  → iteration < 3? Loop back to step 2
   ↓
[6] Final Report Generator (Gemini Flash)
```

---

# Module 1 — Mission Planner

Purpose:
Understand the user's objective and decompose it into investigation tasks.

Input:
User Query

Output (emits SSE event: "planner"):
- Investigation Objective
- Investigation Strategy
- Search Queries (max 5, prioritized)
- Investigation Dimensions

LLM: Gemini Flash
One LLM call. Returns structured JSON.

The planner does NOT search. It only creates the investigation plan.

---

# Module 2 — Tavily Search

Input:
Search Query (one at a time)

Config:
- max_results: 5 per query
- include_raw_content: True
- Max queries per iteration: 5

Returns per result:
- url
- title
- content (snippet)
- raw_content (full text if available)
- score (relevance)

Emits SSE event: "search" after each query completes.

Rate limit safety:
- 5 queries × 3 iterations = 15 Tavily calls max per investigation.
- 0.5s delay between consecutive searches.

---

# Module 3 — Agentic Decision Node (Content Extractor)

This is the core agentic reasoning moment.

Instead of blindly scraping every URL, ULTRON decides:

```
if len(tavily_result["content"]) > 300:
    use snippet directly → no fetch needed
else:
    fetch via Jina Reader → r.jina.ai/{url}
```

Why this matters:
- Avoids unnecessary fetches (saves time + avoids blocking)
- Makes the reasoning visible to judges via SSE events
- Demonstrates true agentic decision-making

Jina Reader:
- URL format: https://r.jina.ai/{target_url}
- No API key required
- Returns clean markdown of any webpage
- No blocking, no CAPTCHA issues

Domain Blocklist (never fetch, skip immediately):
- linkedin.com
- twitter.com / x.com
- facebook.com
- instagram.com
- tiktok.com
- pinterest.com
- quora.com
- researchgate.net

Emits SSE event: "decision" per URL with action taken.

Browser automation (Playwright): REMOVED from pipeline.
BeautifulSoup scraping: REMOVED from pipeline.

---

# Module 4 — Evidence Analyzer

Purpose:
Analyze all collected content in a single LLM call.
Gap detection is combined here — not a separate module.

Input:
All documents collected this iteration

Output (single Gemini Flash call, structured JSON):
- facts: list[str]
- claims: list[str]
- contradictions: list[str]
- missing_topics: list[str]  ← drives next loop
- knowledge_coverage: dict   ← per source type
- confidence:
    - overall: int (0-100)
    - authority: int
    - agreement: int
    - coverage: int
    - recency: int
    - contradictions_penalty: int

Emits SSE events:
- "evidence" → after analysis completes
- "gap" → if missing_topics found
- "confidence" → updated scores
- "loop" → if another iteration starts

After evidence is extracted, raw document content is discarded from memory.
Only structured evidence is retained.

---

# Investigation Loop

```
iteration = 0

WHILE iteration < 3:
    run Tavily Search for current queries
    run Agentic Decision Node per result
    run Evidence Analyzer
    
    if missing_topics is empty OR confidence.overall >= 80:
        BREAK → go to Report Generator
    
    iteration += 1
    queries = generate_queries_from(missing_topics)
```

Hard caps (non-negotiable):
- Max 3 iterations
- Max 5 queries per iteration
- Max 5 results per query
- Max 15 Jina fetches total per investigation

---

# Confidence Score

Derived from Evidence Analyzer output. NOT random.

Factors:
- Source Authority (who published it)
- Source Agreement (do sources agree?)
- Evidence Coverage (how many dimensions covered)
- Recency (how fresh is the data)
- Contradictions (penalizes conflicting claims)

Output example:
```json
{
  "overall": 91,
  "authority": 95,
  "agreement": 88,
  "coverage": 93,
  "recency": 90,
  "contradictions_penalty": 5
}
```

Frontend displays this as a live-updating confidence panel.

---

# Final Report Generator

LLM: Gemini Flash (or GLM 5.x if key available)
Input: All evidence, confidence, knowledge coverage
Output: Markdown report saved to reports/{investigation_id}.md

Report Sections:
- Executive Summary
- Investigation Objectives
- Evidence Used
- Evidence Rejected (blocked domains, low content)
- Key Findings
- Supporting Sources
- Conflicting Sources
- Confidence Analysis
- Knowledge Coverage
- Limitations
- Recommendations
- Final Conclusion

Emits SSE event: "report" with status "completed"

---

# Storage Strategy

No database. No Redis. No external storage.

| Data | Where |
|---|---|
| InvestigationState (in-flight) | Python dict in RAM |
| Raw scraped content | Discarded after Evidence Analyzer runs |
| Final report | reports/{investigation_id}.md on disk |
| Everything else | Lives only for duration of investigation |

InvestigationState fields retained throughout:
- objective, strategy, search_queries
- evidence, claims, contradictions
- missing_topics, knowledge_coverage, confidence
- iteration count, status
- final_report path

---

# SSE Event Contract (Frontend Integration)

The backend continuously pushes these events. Frontend only visualizes — never performs AI logic.

All events follow this shape:
```json
{ "type": "<event_type>", ...data }
```

Full event reference:

```json
{ "type": "planner",    "objective": "...", "queries": [...], "strategy": "..." }
{ "type": "search",     "query": "...", "results_count": 5, "iteration": 1 }
{ "type": "decision",   "url": "...", "domain": "...", "action": "use_snippet|fetch_jina|blocked" }
{ "type": "evidence",   "claims_count": 12, "facts_count": 8, "contradictions": 2 }
{ "type": "gap",        "missing": ["thermal management", "recycling costs"] }
{ "type": "loop",       "iteration": 2, "reason": "Knowledge gaps found" }
{ "type": "confidence", "overall": 87, "authority": 90, "agreement": 83, "coverage": 89, "recency": 85 }
{ "type": "coverage",   "official": 80, "academic": 60, "news": 90, "blogs": 20 }
{ "type": "timeline",   "message": "Evidence merged across 7 sources" }
{ "type": "report",     "status": "completed" }
{ "type": "error",      "message": "..." }
```

---

# REST API

POST /api/investigate
Body: { "query": "Analyze Tesla battery system" }
Returns: { "investigation_id": "uuid" }

GET /api/investigation/{id}/stream
Returns: text/event-stream (SSE)
Streams all events until "report" status "completed" or "error"

GET /api/report/{id}
Returns: raw markdown string of final report

---

# Backend Folder Structure

```
backend/
├── main.py               ← FastAPI app, SSE endpoint, investigation orchestrator
├── state.py              ← InvestigationState dataclass + global registry
├── planner.py            ← Module 1: Mission Planner (Gemini Flash)
├── search.py             ← Module 2: Tavily Search
├── extractor.py          ← Module 3: Agentic Decision Node + Jina fallback
├── evidence_analyzer.py  ← Module 4: Evidence Analysis + Gap Detection (combined)
├── report_generator.py   ← Final Report (Gemini Flash / GLM)
├── prompts/
│   ├── planner.py        ← Planner system prompt
│   ├── analyzer.py       ← Evidence analyzer system prompt
│   └── reporter.py       ← Report generator system prompt
├── utils.py              ← Domain blocklist, content length checks, helpers
├── models.py             ← Pydantic request/response models
├── reports/              ← Generated .md reports stored here
├── .env                  ← API keys
└── requirements.txt
```

---

# Tech Stack (Finalized)

Backend:
- Python 3.11+
- FastAPI
- Pydantic v2
- httpx (async HTTP for Jina fetches)
- python-dotenv
- uvicorn

APIs:
- Tavily Search API (search + content)
- Jina Reader (r.jina.ai) — no key needed
- Gemini Flash (Planner + Evidence Analyzer + Report)
- GLM 5.x (optional, for Final Report only if key available)

Removed from original plan:
- Playwright — replaced by Jina Reader
- BeautifulSoup4 — not needed
- Trafilatura — not needed
- Separate URL Verifier LLM call — replaced by domain blocklist + content length

---

# Rate Limit Summary

| Service | Hard Cap Per Investigation | Strategy |
|---|---|---|
| Tavily | 15 searches max (5q × 3iter) | 0.5s delay between queries |
| Jina Reader | ~15 fetches max | Only when snippet < 300 chars |
| Gemini Flash | ~5 calls total | Planner(1) + Analyzer(≤3) + Report(1) |
| GLM (optional) | 1 call | Final report only |

---

# Explainability

Every autonomous decision emits an SSE event.
Frontend should never show only a loading spinner.

What the user sees in real time:
- Mission plan and search queries (after planner)
- Each search query as it runs
- Decision per URL: snippet used OR Jina fetched OR blocked
- Evidence counts and confidence after each loop
- Knowledge gaps that trigger another search
- Timeline of every action with timestamps
- Final report rendered in markdown viewer

---

# Success Criteria

ULTRON demonstrates:

✓ Autonomous Planning
✓ Intelligent Search (Tavily)
✓ Agentic Decision Making (snippet vs fetch)
✓ Evidence Analysis with Confidence Scoring
✓ Knowledge Gap Detection (built into analyzer)
✓ Iterative Investigation (capped at 3 loops)
✓ Explainable Decision Making via SSE
✓ Trustworthy Final Report

The goal is not to build another chatbot.
The goal is to build an autonomous investigation engine
whose reasoning process is transparent, auditable, and understandable.