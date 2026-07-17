# Implementation Progress

This document tracks finalized milestones and completed items during the development of the ULTRON backend.

## Finalized & Completed

### Stage 0: Investigation Bootstrap
- [x] **In-Memory Registry**: Configured `state.py` to store stateful OSINT runs in RAM to keep things lightweight.
- [x] **FastAPI Core Setup**: Established a basic ASGI app running on Uvicorn.
- [x] **POST Route**: Implemented `POST /api/investigate` to validate user input and respond immediately.
- [x] **Async Background Processing**: Setup FastAPI `BackgroundTasks` to start the execution flow asynchronously without blocking the client.
- [x] **Import Fixes**: Resolved absolute import errors for direct execution.
- [x] **Live Testing**: Verified that the server is alive and responding with a `200 OK` on `/docs`.

## Stage 1: Mission Planner (COMPLETED)
- [x] **Directory Setup**: Created `backend/Stage_1/` folder.
- [x] **VPS Port Routing**: Already active via Bitvise SSH tunnel on port 3001.
- [x] **Endpoint Connectivity Test**: All 3 models verified working.
- [x] **Prompt Definition**: `Stage_1/prompts.py` — planner + retry prompts defined.
- [x] **State Extension**: `Stage_0/state.py` extended with `objective`, `strategy`, `search_queries`, `dimensions`, `iteration`, `all_searched_queries`, `sse_queue`.
- [x] **FreeLLMAPI Integration**: `Stage_1/llm_client.py` — shared async HTTP client with tiered model selection and automatic fallback chain.
- [x] **Planner Core Logic (`planner.py`)**: Calls `gemini-3.5-flash`, retries once on malformed JSON, falls back to raw query split.
- [x] **SSE Stream Endpoint**: `GET /api/investigation/{id}/stream` with 8-second heartbeat implemented in `Stage_0/main.py`.
- [x] **Planner SSE Push**: `{ "type": "planner", ... }` emitted and confirmed in live stream test.

## Stage 2: Tavily Search (COMPLETED SETUP, PENDING INTEGRATION)
- [x] **Directory Setup**: Created `backend/Stage_2/` folder.
- [x] **State Extension**: Added `raw_results` field to `InvestigationState` in `state.py`.
- [x] **Domain Blocklist & Utilities**: Implemented utility function in `utils.py` (or within `Stage_2`) to filter results by domain blocklist (e.g. `linkedin.com`, `twitter.com`, etc.).
- [x] **Tavily Search client (`search.py`)**:
    - [x] Setup Tavily HTTP integration using `httpx`.
    - [x] Loop queries sequentially with 0.5s delay.
    - [x] Set `include_raw_content=True` and `max_results=5`.
    - [x] Handle Tavily API timeouts (10s limit) and retry once per query.
    - [x] Filter output results through the domain blocklist.
- [x] **Tavily SSE Pushes**:
    - [x] Emit `{ "type": "search", "query": ..., "results_count": ..., "iteration": ... }` per query.
    - [x] Emit timeline event messages for edge cases (e.g. no results, rate limit timeouts, blocked domains).
- [x] **Orchestrator Integration**:
    - [x] Import `run_search` in `backend/Stage_0/main.py`.
    - [x] Integrate and invoke `await run_search(state)` in `run_investigation` after the Stage 1 planner.
    - [x] Verify integration with local API tests.

## Stage 3: Agentic Decision Node (COMPLETED)
- [x] **Directory Setup**: Create `backend/Stage_3/` folder.
- [x] **State Extension**: Add `documents` field to `InvestigationState` in `state.py` to store processed results.
- [x] **Extractor Module (`extractor.py`)**:
    - [x] Implement decision logic for each search result (use raw content if >300 chars, snippet if >300 chars, else fetch from Jina Reader `r.jina.ai/{url}`).
    - [x] Set Jina timeout limit (15s) and handle exceptions.
    - [x] Skip invalid/blocked/empty results.
- [x] **SSE Pushes & Logs**:
    - [x] Emit `{ "type": "decision", "url": ..., "domain": ..., "action": ..., "iteration": ... }` per result.
    - [x] Emit timeline event warnings for Jina timeouts or empty results.
- [x] **Orchestrator Integration**:
    - [x] Import `run_extractor` in `backend/Stage_0/main.py`.
    - [x] Invoke `await run_extractor(state)` in `run_investigation` after `run_search(state)`.
    - [x] Verify integration with tests.

## Stage 4: Evidence Analyzer + Gap Detector (COMPLETED)
- [x] **Directory Setup**: Create `backend/Stage_4/` folder.
- [x] **State Extension**:
    - [x] Add `evidence`, `claims`, `contradictions`, `missing_topics`, `knowledge_coverage`, and `confidence` fields to `InvestigationState` in `state.py`.
- [x] **Analyzer Module (`evidence_analyzer.py`)**:
    - [x] Formulate prompts mapping the authority scoring heuristics and fact deduplication instructions.
    - [x] Connect with FreeLLMAPI (`nemotron-3-nano-30b-reasoning` primary, fallback chain active).
    - [x] Implement parsing logic with one retry on invalid JSON.
    - [x] Implement document chunking logic (3000 tokens limit) if text exceeds LLM limits, merging outputs.
    - [x] Clear `state.documents` memory after a successful run.
- [x] **SSE Pushes & Logs**:
    - [x] Emit `{ "type": "evidence", "facts_count": ..., "claims_count": ..., "contradictions": ..., "iteration": ... }` event.
    - [x] Emit `{ "type": "confidence", ... }` and `{ "type": "coverage", ... }` events.
    - [x] Emit `{ "type": "gap", "missing": ... }` event.
    - [x] Emit timeline status message with overall confidence.
- [x] **Orchestrator Integration**:
    - [x] Import `run_analyzer` in `backend/Stage_0/main.py`.
    - [x] Invoke `await run_analyzer(state)` in `run_investigation` after Stage 3.
    - [x] Verify integration with tests.

## Stage 5: Loop Controller + Query Generator (COMPLETED)
- [x] **Loop Decision Logic**:
    - [x] Integrate checks in `run_investigation` in `main.py`: loop if `missing_topics` exist AND `confidence["overall"] < 80` AND `iteration < 3`.
    - [x] Stop/Break loop and proceed to Stage 6 otherwise.
- [x] **Gap Query Generator Module**:
    - [x] Implement `generate_queries_from_gaps(state)` using `gemini-3.5-flash` model.
    - [x] Formulate prompts to generate 3-5 gap-filling queries, avoiding previously searched queries.
    - [x] Implement JSON formatting and robust parsing with a raw-string split fallback.
- [x] **SSE Pushes & Logs**:
    - [x] Emit `{ "type": "loop", "iteration": ..., "reason": ..., "new_queries": [...] }` event when looping.
    - [x] Verify loop states and logging during sequential iterations.

## Stage 6: Final Report Generator (COMPLETED)
- [x] **Directory Setup**: Create `backend/reports/` folder to persist markdown reports.
- [x] **Report Generator Module (`report_generator.py`)**:
    - [x] Connect with FreeLLMAPI (`nemotron-3-super-120b` primary, fallback chain active).
    - [x] Draft structured system prompt defining report sections (Executive Summary, Findings, Confidence, Limitations, etc.).
    - [x] Implement file system save (`reports/{investigation_id}.md`) and fallback to SSE payload transmission if disk write fails.
- [x] **SSE Pushes**:
    - [x] Emit `{ "type": "timeline", "message": "Generating final report..." }` and `{ "type": "report", "status": "completed" }`.
- [x] **API Endpoint**:
    - [x] Add `GET /api/report/{investigation_id}` endpoint in `main.py` to serve the generated raw Markdown file.
- [x] **Orchestrator Integration**:
    - [x] Call `await run_report_generator(state)` at the end of `run_investigation()`.
    - [x] Close the stream properly after report completion.




## Model Allocation Strategy (FreeLLMAPI)

Based on task intelligence and latency requirements, the models are distributed as follows:

| Task / Stage | Primary Model | Role Description |
| :--- | :--- | :--- |
| **Stage 1 (Mission Planner)** | `gemini-3.5-flash` | Quick query decomposition and structuring. |
| **Stage 4 (Evidence Analyzer + Gap Detector)** | `nemotron-3-nano-30b-reasoning` | High-quality reasoning for fact/claim/contradiction extraction and coverage gap check. |
| **Stage 5 (Gap Query Generator)** | `gemini-3.5-flash` | Quick generation of target search queries from identified gaps. |
| **Stage 6 (Final Report Generator)** | `nemotron-3-super-120b` | Compilation of evidence and creation of the final markdown report. |

*Fallback Chain:* In case of any API error or 429/500 rate limits, calls will automatically fall back sequentially to the next most stable/available models in the group (`gemini-3.5-flash` -> `nemotron-3-nano-30b-reasoning` -> `nemotron-3-super-120b`).


