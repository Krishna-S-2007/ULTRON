# Project Context

This document tracks all the implemented files in the ULTRON backend, mapped to their respective stage, purpose, and the specific feature they resolve.

## Stage 0: Investigation Bootstrap

| File | Purpose | Feature Solved |
| :--- | :--- | :--- |
| [state.py](file:///c:/Users/Krishna/Desktop/XAI/backend/Stage_0/state.py) | Defines the `InvestigationState` dataclass and registers active investigations in an in-memory dictionary. | **Data Storage & State Management:** Keeps track of the live investigation state (e.g., query, status) without requiring a database overhead. |
| [models.py](file:///c:/Users/Krishna/Desktop/XAI/backend/Stage_0/models.py) | Defines Pydantic validation schemas (`InvestigateRequest` and `InvestigateResponse`) for input queries. | **API Request Validation:** Rejects empty or invalid query inputs immediately with a `400 Bad Request`. |
| [main.py](file:///c:/Users/Krishna/Desktop/XAI/backend/Stage_0/main.py) | Implements the FastAPI application, CORS middleware, the `POST /api/investigate` endpoint, the `GET /api/investigation/{id}/stream` SSE stream endpoint with heartbeat, and the orchestrator loop. | **Asynchronous Bootstrapping & Streaming:** Receives user queries, spawns the main pipeline asynchronously, and streams live progress events (including heartbeats) to the client. |
| [requirements.txt](file:///c:/Users/Krishna/Desktop/XAI/backend/Stage_0/requirements.txt) | Lists dependencies needed specifically to run the Stage 0/1 microservice. | **Dependency Management:** Keeps dependencies isolated and clean (adds `python-dotenv` and `httpx` for model integration). |

## Stage 1: Mission Planner

| File | Purpose | Feature Solved |
| :--- | :--- | :--- |
| [llm_client.py](file:///c:/Users/Krishna/Desktop/XAI/backend/Stage_1/llm_client.py) | Shared async HTTP client for accessing FreeLLMAPI with sequential model fallbacks. | **LLM Integration & Fault Tolerance:** Centralizes unified model communication and handles fallback rules (`gemini-3.5-flash` → `nemotron-3-nano-30b-reasoning` → `nemotron-3-super-120b`). |
| [prompts.py](file:///c:/Users/Krishna/Desktop/XAI/backend/Stage_1/prompts.py) | Defines the Mission Planner system instructions and formatting rules for JSON query output. | **Prompt Engineering:** Standardizes objective decomposition, strategy formulation, target queries (max 5), and dimensions generation. |
| [planner.py](file:///c:/Users/Krishna/Desktop/XAI/backend/Stage_1/planner.py) | Implements the Stage 1 core pipeline controller (Gemini Flash execution, retry flow on invalid JSON, fallback keyword parsing, and state updates). | **Mission Planning & Orchestration:** Decomposes queries into structured search tasks, registers them on the state, and emits the `planner` SSE event to the client stream. |

## Stage 2: Tavily Search

| File | Purpose | Feature Solved |
| :--- | :--- | :--- |
| [search.py](file:///c:/Users/Krishna/Desktop/XAI/backend/Stage_2/search.py) | Implements Tavily Search queries looping, retry handling, domain filtering, and results mapping. | **Information Gathering:** Queries the Tavily Search API sequentially, filters out noise/blocked domains, and stores raw search results inside the state. |
| [utils.py](file:///c:/Users/Krishna/Desktop/XAI/backend/Stage_2/utils.py) | Shared utilities mapping the domain blocklist, domain parsing helpers, and content length validations. | **Sanitization & Decoupled Logic:** Decouples core search from string parsing/domain check logic to keep Stage 2 code clean. |

## Stage 3: Agentic Decision Node

| File | Purpose | Feature Solved |
| :--- | :--- | :--- |
| [extractor.py](file:///c:/Users/Krishna/Desktop/XAI/backend/Stage_3/extractor.py) | Implements the decision flow mapping each raw result to either raw extraction, snippet extraction, or Jina Reader fetching. | **Web Scraping & Normalization:** Selects optimal scraping methods per URL, queries Jina Reader for full text, structures documents, and emits decision SSE events. |

## Stage 4: Evidence Analyzer + Gap Detector

| File | Purpose | Feature Solved |
| :--- | :--- | :--- |
| [evidence_analyzer.py](file:///c:/Users/Krishna/Desktop/XAI/backend/Stage_4/evidence_analyzer.py) | Analyzes all gathered documents, extracts facts/claims/contradictions, calculates confidence scores, and identifies research gaps. | **Evidence Synthesis & Gap Analysis:** Uses reasoning models to extract deduplicated facts, evaluate source authority, identify contradictions, outline missing information, and release document memory. |

## Stage 5: Loop Controller + Query Generator

| File | Purpose | Feature Solved |
| :--- | :--- | :--- |
| [main.py](file:///c:/Users/Krishna/Desktop/XAI/backend/Stage_0/main.py) | Runs the loop decision check (iteration < 3, confidence < 80, gaps present) and queries FreeLLMAPI to generate new gap-filling queries. | **OSINT Iterative Looping:** Decides when to loop or break, generates targeted gap-filling search queries using Gemini Flash, and restarts the Tavily search stage. |

## Stage 6: Final Report Generator

| File | Purpose | Feature Solved |
| :--- | :--- | :--- |
| [report_generator.py](file:///c:/Users/Krishna/Desktop/XAI/backend/Stage_6/report_generator.py) | Connects with the Nemotron-120B model to synthesize all gathered evidence into a structured markdown report and saves it to disk. | **Report Compilation:** Compiles facts/contradictions into a final PDF-ready markdown layout, saves reports to a local directory, and serves reports via API. |





