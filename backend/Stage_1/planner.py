"""
planner.py — Stage 1: Mission Planner
Calls gemini-3.5-flash via FreeLLMAPI to decompose a query into an investigation plan.
Writes the result directly into InvestigationState and pushes an SSE event.
"""

import json
import sys
import os

# Allow importing from Stage_0 and Stage_1 when run from any CWD
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from Stage_0.state import InvestigationState
from Stage_1.llm_client import call_llm, MODELS
from Stage_1.prompts import PLANNER_SYSTEM_PROMPT, PLANNER_RETRY_PROMPT


async def run_planner(state: InvestigationState) -> None:
    """
    Run the Mission Planner for the given investigation state.

    - Calls gemini-3.5-flash with the structured planner system prompt.
    - Retries once with an explicit retry prompt if JSON is malformed.
    - Falls back to splitting the raw query into 3 search terms if both fail.
    - Writes results into state and pushes an SSE event.
    """
    print(f"[Stage 1] Running planner for: {state.query}")

    messages = [
        {"role": "system", "content": PLANNER_SYSTEM_PROMPT},
        {"role": "user", "content": state.query},
    ]

    raw = None
    plan = None

    # --- Attempt 1: normal call ---
    try:
        raw = await call_llm(messages, model=MODELS["flash"])
        plan = _parse_plan(raw)
    except Exception as e:
        print(f"[Stage 1] Attempt 1 failed: {e}")

    # --- Attempt 2: retry with explicit format reminder ---
    if plan is None:
        print("[Stage 1] Retrying with explicit JSON reminder...")
        try:
            retry_messages = messages + [
                {"role": "assistant", "content": raw or ""},
                {"role": "user", "content": PLANNER_RETRY_PROMPT},
            ]
            raw = await call_llm(retry_messages, model=MODELS["flash"])
            plan = _parse_plan(raw)
        except Exception as e:
            print(f"[Stage 1] Attempt 2 failed: {e}")

    # --- Fallback: split query into 3 generic terms ---
    if plan is None:
        print("[Stage 1] Using fallback plan from raw query words.")
        words = state.query.split()
        plan = {
            "objective": f"Investigate: {state.query}",
            "strategy": "Broad search covering multiple source types.",
            "search_queries": [state.query] if len(words) <= 3 else [
                " ".join(words[:3]),
                " ".join(words[3:6]) if len(words) > 3 else state.query,
                state.query,
            ],
            "dimensions": ["general"],
        }

    # --- Apply hard caps ---
    plan["search_queries"] = plan["search_queries"][:5]  # max 5 queries
    if not plan["search_queries"]:
        plan["search_queries"] = [state.query]           # min 1 query

    # --- Write to state ---
    state.objective = plan["objective"]
    state.strategy = plan["strategy"]
    state.search_queries = plan["search_queries"]
    state.dimensions = plan.get("dimensions", [])
    state.all_searched_queries.extend(plan["search_queries"])

    print(f"[Stage 1] Plan ready. Objective: {state.objective}")
    print(f"[Stage 1] Queries: {state.search_queries}")

    # --- Push SSE event ---
    await _push_sse(state, plan)


def _parse_plan(raw: str) -> dict | None:
    """
    Try to parse the raw LLM response as JSON.
    Returns the parsed dict or None if parsing fails.
    """
    try:
        # Strip potential markdown fences
        cleaned = raw.strip()
        if cleaned.startswith("```"):
            lines = cleaned.splitlines()
            cleaned = "\n".join(lines[1:-1]).strip()
        data = json.loads(cleaned)
        # Validate required keys
        assert "objective" in data
        assert "search_queries" in data
        assert isinstance(data["search_queries"], list)
        return data
    except Exception:
        return None


async def _push_sse(state: InvestigationState, plan: dict) -> None:
    """Push the planner SSE event into the state's queue."""
    if state.sse_queue is None:
        return
    from datetime import datetime, timezone
    ts = datetime.now(timezone.utc).isoformat()
    # Frontend LiveEvent expects: { type, task, timestamp }
    event = {
        "type":      "planner",
        "task":      f"Decomposing: {plan['objective']}",
        "timestamp": ts,
        # Extra fields (ignored by frontend type guard but useful for debugging)
        "objective":  plan["objective"],
        "strategy":   plan.get("strategy", ""),
        "queries":    plan["search_queries"],
        "dimensions": plan.get("dimensions", []),
    }
    await state.sse_queue.put(event)

    # Also push a timeline audit event so AuditTimeline shows it
    now_ts = datetime.now(timezone.utc).isoformat()
    await state.sse_queue.put({
        "type":      "timeline",
        "message":   f"Mission planned: {plan['objective'][:80]}",
        "kind":      "info",
        "timestamp": now_ts,
    })
