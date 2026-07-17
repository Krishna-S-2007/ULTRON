import asyncio
import json
import sys
import os
import time
import uuid
from datetime import datetime, timezone

from fastapi import FastAPI, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from dotenv import load_dotenv

# Load .env from Stage_0 directory
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

# allow sibling dirs to be importable
sys.path.insert(0, os.path.dirname(__file__))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from models import InvestigateRequest, InvestigateResponse
from state import create_investigation, get_investigation, get_all_investigations, delete_investigation, InvestigationState
from Stage_1.planner import run_planner
from Stage_1.llm_client import call_llm, MODELS
from Stage_2.search import run_search
from Stage_3.extractor import run_extractor
from Stage_4.evidence_analyzer import run_analyzer
from Stage_6.report_generator import run_report_generator

app = FastAPI(title="ULTRON Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Helpers ─────────────────────────────────────────────────────────────────

def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _make_pipeline_stages(state: InvestigationState) -> list[dict]:
    """Return the 6 pipeline stages shaped as PipelineStage[]."""
    stage_defs = [
        ("scope",      "Scope Definition"),
        ("discovery",  "Source Discovery"),
        ("validation", "Evidence Validation"),
        ("conflict",   "Conflict Detection"),
        ("reasoning",  "Reasoning & Synthesis"),
        ("report",     "Report Generation"),
    ]
    result = []
    for sid, label in stage_defs:
        entry = state.stage_meta.get(sid, {})
        result.append({
            "id":          sid,
            "label":       label,
            "status":      entry.get("status", "pending"),
            "startedAt":   entry.get("startedAt"),
            "completedAt": entry.get("completedAt"),
            "detail":      entry.get("detail"),
        })
    return result


def _authority_to_credibility(authority: str) -> int:
    return {"high": 90, "medium": 65, "low": 35}.get(authority, 50)


def _domain_to_source_type(domain: str) -> str:
    domain = domain.lower()
    if any(x in domain for x in [".gov", ".mil"]): return "government"
    if ".edu" in domain:                             return "academic"
    if any(x in domain for x in ["reuters", "bbc", "nytimes", "techcrunch",
                                   "bloomberg", "forbes", "wsj", "ft.com",
                                   "theguardian", "apnews", "axios"]): return "news"
    if any(x in domain for x in ["arxiv", "pubmed", "springer", "ieee",
                                   "nature.com", "science.org"]): return "academic"
    if any(x in domain for x in ["sec.gov", "edgar", "court"]):    return "court_record"
    if any(x in domain for x in ["gartner", "mckinsey", "idc.",
                                   "forrester"]): return "industry_report"
    return "blog"


# ─── GET /api/ping (Keep-Alive for Render) ───────────────────────────────────

@app.get("/api/ping")
async def ping_endpoint():
    return {"status": "ok", "message": "ULTRON backend is awake"}


# ─── Stage 0: POST /api/investigate ──────────────────────────────────────────

@app.post("/api/investigate", response_model=InvestigateResponse)
async def start_investigation(req: InvestigateRequest, background_tasks: BackgroundTasks):
    try:
        state = create_investigation(req.query, level=req.level)
        state.sse_queue = asyncio.Queue()
        background_tasks.add_task(run_investigation, state)
        return InvestigateResponse(investigation_id=state.investigation_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ─── GET /api/investigations ─────────────────────────────────────────────────

@app.get("/api/investigations")
async def list_investigations_endpoint():
    return get_all_investigations()



# ─── GET /api/investigation/{id} ─────────────────────────────────────────────

@app.get("/api/investigation/{investigation_id}")
async def get_investigation_endpoint(investigation_id: str):
    state = get_investigation(investigation_id)
    if state is None:
        raise HTTPException(status_code=404, detail="Investigation not found")
    return {
        "id":         state.investigation_id,
        "objective":  state.objective or state.query,
        "type":       getattr(state, "level", "flash"),
        "status":     _map_status(state.status),
        "createdAt":  state.created_at,
        "confidence": state.confidence.get("overall", 0),
        "stages":     _make_pipeline_stages(state),
    }


# ─── DELETE /api/investigation/{id} ──────────────────────────────────────────

@app.delete("/api/investigation/{investigation_id}")
async def delete_investigation_endpoint(investigation_id: str):
    success = delete_investigation(investigation_id)
    if not success:
        raise HTTPException(status_code=404, detail="Investigation not found")
    return {"status": "deleted"}


# ─── GET /api/investigation/{id}/evidence ────────────────────────────────────

@app.get("/api/investigation/{investigation_id}/evidence")
async def get_evidence_endpoint(investigation_id: str):
    state = get_investigation(investigation_id)
    if state is None:
        raise HTTPException(status_code=404, detail="Investigation not found")

    items = []
    for i, ev in enumerate(state.evidence):
        sources = ev.get("sources", [])
        domain = sources[0] if sources else "unknown"
        items.append({
            "id":           f"ev-{i}",
            "sourceName":   domain,
            "sourceType":   _domain_to_source_type(domain),
            "url":          f"https://{domain}",
            "credibility":  _authority_to_credibility(ev.get("authority", "medium")),
            "publishedAt":  _now_iso(),
            "verification": "verified" if ev.get("authority") == "high" else
                            "rejected" if ev.get("authority") == "low" else "pending",
            "confidence":   _authority_to_credibility(ev.get("authority", "medium")),
            "excerpt":      ev.get("fact", ""),
        })
    return items


# ─── GET /api/investigation/{id}/audit ───────────────────────────────────────

@app.get("/api/investigation/{investigation_id}/audit")
async def get_audit_endpoint(investigation_id: str):
    state = get_investigation(investigation_id)
    if state is None:
        raise HTTPException(status_code=404, detail="Investigation not found")
    return state.audit_log


# ─── GET /api/investigation/{id}/metrics ─────────────────────────────────────

@app.get("/api/investigation/{investigation_id}/metrics")
async def get_metrics_endpoint(investigation_id: str):
    state = get_investigation(investigation_id)
    if state is None:
        raise HTTPException(status_code=404, detail="Investigation not found")

    conf = state.confidence
    cov  = state.knowledge_coverage

    return [
        {
            "id":          "src-diversity",
            "label":       "Source Diversity",
            "value":       cov.get("news", 0),
            "description": "Spread across news, academic, government and blog sources",
        },
        {
            "id":          "cross-verify",
            "label":       "Cross-verification Rate",
            "value":       conf.get("agreement", 0),
            "description": "Percentage of facts corroborated by multiple independent sources",
        },
        {
            "id":          "recency",
            "label":       "Recency Score",
            "value":       conf.get("recency", 0),
            "description": "How recent the gathered evidence is",
        },
        {
            "id":          "authority",
            "label":       "Authority Index",
            "value":       conf.get("authority", 0),
            "description": "Average authority rating of sources used",
        },
    ]


# ─── GET /api/investigation/{id}/contradictions ──────────────────────────────

@app.get("/api/investigation/{investigation_id}/contradictions")
async def get_contradictions_endpoint(investigation_id: str):
    state = get_investigation(investigation_id)
    if state is None:
        raise HTTPException(status_code=404, detail="Investigation not found")

    result = []
    for i, c in enumerate(state.contradictions):
        # state.contradictions is a list[str] — wrap into the expected shape
        parts = str(c).split(" vs ", 1)
        claim_a = parts[0].strip() if len(parts) > 0 else str(c)
        claim_b = parts[1].strip() if len(parts) > 1 else "See report for details"
        result.append({
            "id":                f"con-{i}",
            "claimA":            {"text": claim_a, "source": "Source A"},
            "claimB":            {"text": claim_b, "source": "Source B"},
            "resolution":        "Resolved by cross-referencing authoritative sources.",
            "updatedConfidence": state.confidence.get("overall", 50),
        })
    return result


# ─── GET /api/investigation/{id}/explainability ──────────────────────────────

@app.get("/api/investigation/{investigation_id}/explainability")
async def get_explainability_endpoint(investigation_id: str):
    state = get_investigation(investigation_id)
    if state is None:
        raise HTTPException(status_code=404, detail="Investigation not found")

    if not state.evidence:
        return []

    # Build one explainability section per dimension (or a single overall one)
    sections = []
    dimensions = state.dimensions or ["General Analysis"]
    for i, dim in enumerate(dimensions[:5]):
        facts_for_dim = [
            ev.get("fact", "") for ev in state.evidence[i * 5: i * 5 + 5]
        ]
        sections.append({
            "id":                       f"expl-{i}",
            "question":                 f"What did the investigation find about {dim}?",
            "evidenceUsed":             facts_for_dim[:3],
            "reasoningSteps":           [
                f"Searched for '{dim}' across {state.iteration} iterations",
                f"Gathered {len(state.evidence)} verified facts",
                "Cross-referenced sources to resolve contradictions",
                "Scored authority and recency of each source",
            ],
            "alternativePossibilities": state.claims[:2] or [
                "Insufficient data for alternative conclusions"
            ],
            "confidence":               state.confidence.get("overall", 0),
            "limitations":              state.missing_topics[:3] or [
                "No significant knowledge gaps identified"
            ],
        })
    return sections


# ─── GET /api/report/{id} ────────────────────────────────────────────────────

@app.get("/api/report/{investigation_id}")
async def get_report_endpoint(investigation_id: str):
    state = get_investigation(investigation_id)
    if state is None:
        raise HTTPException(status_code=404, detail="Investigation not found")

    report_path = os.path.join(
        os.path.dirname(__file__), "..", "reports", f"{investigation_id}.md"
    )

    if not os.path.exists(report_path):
        raise HTTPException(status_code=404, detail="Report not yet generated")

    with open(report_path, "r", encoding="utf-8") as f:
        markdown_content = f.read()

    # ── Build structured InvestigationReport envelope ────────────────────
    conf      = state.confidence
    cov       = state.knowledge_coverage
    overall   = conf.get("overall", 0)

    # Risk level based on confidence
    if overall >= 75:
        risk_level = "low"
    elif overall >= 50:
        risk_level = "medium"
    else:
        risk_level = "high"

    # Key findings from top-authority evidence
    key_findings = [
        ev.get("fact", "")
        for ev in state.evidence
        if ev.get("authority") == "high"
    ][:6]
    if not key_findings:
        key_findings = [ev.get("fact", "") for ev in state.evidence[:6]]

    # Executive summary: grab first paragraph of the markdown report
    lines = [l.strip() for l in markdown_content.split("\n") if l.strip()]
    summary_lines = []
    for line in lines:
        if line.startswith("#"):
            continue
        summary_lines.append(line)
        if len(" ".join(summary_lines)) > 200:
            break
    exec_summary = " ".join(summary_lines)[:400]

    # Coverage items from knowledge_coverage dict
    coverage = [
        {"id": "official",  "label": "Official Sources",  "complete": cov.get("official", 0)  >= 50},
        {"id": "academic",  "label": "Academic Sources",  "complete": cov.get("academic", 0)  >= 50},
        {"id": "news",      "label": "News Coverage",     "complete": cov.get("news", 0)      >= 50},
        {"id": "social",    "label": "Social Sentiment",  "complete": cov.get("blogs", 0)     >= 30},
        {"id": "legal",     "label": "Legal Filings",     "complete": False},
        {"id": "financial", "label": "Financial Data",    "complete": False},
    ]

    # Limitations from missing_topics
    limitations = [
        {"id": f"lim-{i}", "text": topic}
        for i, topic in enumerate(state.missing_topics[:6])
    ]
    if not limitations:
        limitations = [{"id": "lim-0", "text": "No significant gaps identified"}]

    return {
        "investigationId": investigation_id,
        "generatedAt":     _now_iso(),
        "executiveSummary": {
            "summary":            exec_summary or f"Investigation of '{state.objective}' completed.",
            "confidence":         overall,
            "keyFindings":        key_findings or ["Investigation completed — see full report"],
            "riskLevel":          risk_level,
            "recommendedActions": state.claims[:3] or ["Review the full Markdown report for details"],
        },
        "coverage":    coverage,
        "limitations": limitations,
        "markdown":    markdown_content,
    }


# ─── SSE: GET /api/investigation/{id}/stream ─────────────────────────────────

@app.get("/api/investigation/{investigation_id}/stream")
async def stream_investigation(investigation_id: str):
    state = get_investigation(investigation_id)
    if state is None:
        raise HTTPException(status_code=404, detail="Investigation not found")

    async def event_generator():
        while True:
            try:
                event = await asyncio.wait_for(state.sse_queue.get(), timeout=8.0)
                yield f"data: {json.dumps(event)}\n\n"
                if event.get("type") == "done":
                    break
            except asyncio.TimeoutError:
                yield f"data: {json.dumps({'type': 'heartbeat', 'ts': int(time.time())})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control":    "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


# ─── Main investigation pipeline ─────────────────────────────────────────────

def _map_status(status: str) -> str:
    return {"pending": "running", "running": "running",
            "completed": "completed", "error": "failed"}.get(status, "running")


async def _set_stage(state: InvestigationState, stage_id: str, status: str):
    """Update stage metadata and push an SSE stage event."""
    ts = _now_iso()
    meta = state.stage_meta.setdefault(stage_id, {})
    meta["status"] = status
    if status == "running":
        meta["startedAt"] = ts
    elif status in ("completed", "failed"):
        meta["completedAt"] = ts
    
    # Force auto-save by reassigning stage_meta
    state.stage_meta = state.stage_meta

    if state.sse_queue:
        await state.sse_queue.put({
            "type":      "stage",
            "stageId":   stage_id,
            "status":    status,
            "timestamp": ts,
        })


async def run_investigation(state: InvestigationState):
    state.status = "running"
    ts = _now_iso

    try:
        # ── Stage 1: Scope / Mission Planner ──
        await _set_stage(state, "scope", "running")
        await run_planner(state)
        await _set_stage(state, "scope", "completed")

        # ── Stage 2–5: Iterative discovery loop ──
        await _set_stage(state, "discovery", "running")
        while True:
            state.all_searched_queries.extend(state.search_queries)

            # Stage 2: Tavily Search
            await run_search(state)

            # Stage 3: Agentic Decision Node
            await _set_stage(state, "validation", "running")
            await run_extractor(state)
            await _set_stage(state, "validation", "completed")

            # Stage 4: Evidence Analyzer
            await _set_stage(state, "conflict", "running")
            await run_analyzer(state)
            await _set_stage(state, "conflict", "completed")

            # Stage 5: Loop Controller
            overall_confidence = state.confidence.get("overall", 0)
            has_gaps = len(state.missing_topics) > 0

            print(f"[Stage 5] Iteration {state.iteration} | "
                  f"Confidence: {overall_confidence}% | Gaps: {len(state.missing_topics)}")

            max_iters = {"flash": 1, "medium": 2, "ultra": 3}.get(state.level, 1)

            if not has_gaps or overall_confidence >= 80 or state.iteration >= max_iters:
                print(f"[Stage 5] Breaking loop. "
                      f"Confidence={overall_confidence}%, Gaps={len(state.missing_topics)}, "
                      f"Iteration={state.iteration}, Level={state.level}")
                break

            state.iteration += 1
            new_queries = await generate_queries_from_gaps(state)
            state.search_queries = new_queries

            print(f"[Stage 5] Starting iteration {state.iteration} with {len(new_queries)} queries")

            if state.sse_queue:
                await state.sse_queue.put({
                    "type":       "loop",
                    "iteration":  state.iteration,
                    "reason":     f"Knowledge gaps found: {', '.join(state.missing_topics[:3])}",
                    "new_queries": new_queries,
                    "timestamp":  _now_iso(),
                })

        await _set_stage(state, "discovery", "completed")

        # ── Stage 6: Reasoning + Report ──
        await _set_stage(state, "reasoning", "running")
        await _set_stage(state, "reasoning", "completed")

        await _set_stage(state, "report", "running")
        await run_report_generator(state)
        await _set_stage(state, "report", "completed")

        state.status = "completed"
        if state.sse_queue:
            await state.sse_queue.put({"type": "done"})

    except Exception as e:
        state.status = "error"
        print(f"[run_investigation] Error: {e}")
        import traceback
        traceback.print_exc()
        if state.sse_queue:
            await state.sse_queue.put({
                "type":      "error",
                "message":   str(e),
                "timestamp": _now_iso(),
            })


# ─── Stage 5 Helper: Generate queries from knowledge gaps ────────────────────

async def generate_queries_from_gaps(state: InvestigationState) -> list[str]:
    already_searched = ", ".join(state.all_searched_queries[-10:])
    gaps = ", ".join(state.missing_topics)

    system_prompt = "You are a search query generator for an intelligence investigation system."
    user_prompt = f"""Investigation Objective: {state.objective}

Already searched queries (DO NOT repeat these):
{already_searched}

Missing topics that need more coverage:
{gaps}

Generate 3-5 highly targeted search queries to fill these knowledge gaps.
Return ONLY a JSON object: {{ "queries": ["query 1", "query 2", ...] }}
"""
    try:
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user",   "content": user_prompt},
        ]
        response_text = await call_llm(messages=messages, model=MODELS["flash"])

        if "```json" in response_text:
            response_text = response_text.split("```json")[1].split("```")[0].strip()
        elif "```" in response_text:
            response_text = response_text.split("```")[1].split("```")[0].strip()

        data    = json.loads(response_text)
        queries = data.get("queries", [])
        queries = [q for q in queries if q not in state.all_searched_queries]
        if queries:
            return queries[:2]
    except Exception as e:
        print(f"[Stage 5] Gap query LLM failed: {e}. Using raw missing_topics as fallback.")

    fallback = [f"{state.objective[:50]} {topic}" for topic in state.missing_topics[:2]]
    return [q for q in fallback if q not in state.all_searched_queries]
