"""
report_generator.py — Stage 6: Final Report Generator
Synthesizes all gathered evidence, claims, contradictions, and confidence data
into a structured Markdown report using the Nemotron-3-super-120B model.
Saves report to disk and emits SSE completion events.
"""

import os
import sys
import json

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from Stage_0.state import InvestigationState
from Stage_1.llm_client import call_llm, MODELS

REPORT_MODEL = MODELS["super"]  # nemotron-3-super-120b

# Absolute path to the reports directory
REPORTS_DIR = os.path.join(os.path.dirname(__file__), "..", "reports")

SYSTEM_PROMPT = """You are an expert intelligence analyst and report writer.
Your job is to synthesize all gathered evidence into a structured, professional Markdown investigation report.

### Report Structure (use these exact section headers):
1. ## Executive Summary
   - 2-3 sentences describing the investigation goal and key conclusions.

2. ## Investigation Objectives
   - Objective and strategy used.

3. ## Key Findings
   - Bullet list of the most important verified facts. For each finding, cite the source domain(s).

4. ## Claims (Unverified)
   - Bullet list of claims made by companies or individuals that are not independently verified.

5. ## Contradictions & Conflicts
   - Any conflicting information found between sources. Highlight clearly.

6. ## Confidence Analysis
   - Overall confidence score (%), authority score, agreement score, coverage score, recency score.
   - Explain what each score means for this investigation.

7. ## Knowledge Coverage
   - Coverage percentages for: Official sources, Academic sources, News sources, Blogs/Forums.

8. ## Limitations
   - Any knowledge gaps that remain after the investigation.
   - Note if confidence is below 80% and explain why.

9. ## Recommendations
   - What further steps could be taken to improve coverage.

10. ## Conclusion
    - 3-5 sentences final assessment of the topic investigated.

### Output Format:
Write the full report as pure Markdown. Do NOT wrap in code blocks. Do NOT output JSON.
Start directly with: # Investigation Report: {objective}
"""


async def run_report_generator(state: InvestigationState) -> None:
    """
    Generate the final Markdown investigation report using Nemotron-3-super-120B.
    Saves to reports/{investigation_id}.md on disk.
    Emits SSE events.
    """
    print(f"[Stage 6] Generating final report for investigation: {state.investigation_id}")

    # Push timeline event
    await _push_sse(state, {"type": "timeline", "message": "Generating final report..."})

    # Build the evidence summary for LLM input
    evidence_summary = _build_evidence_summary(state)

    user_prompt = f"""Objective: {state.objective}
Strategy: {state.strategy}

Evidence ({len(state.evidence)} verified facts):
{evidence_summary}

Claims: {json.dumps(state.claims, indent=2)}

Contradictions: {json.dumps(state.contradictions, indent=2)}

Confidence Scores: {json.dumps(state.confidence, indent=2)}

Knowledge Coverage: {json.dumps(state.knowledge_coverage, indent=2)}

Remaining Knowledge Gaps: {json.dumps(state.missing_topics, indent=2)}

Total Iterations Run: {state.iteration}

Generate the full structured report as described."""

    level_instruction = {
        "flash": "Keep the report concise, rapid, and focused on immediate key takeaways.",
        "medium": "Provide a balanced, standard analytical report with good depth.",
        "ultra": "Produce a highly detailed, comprehensive deep-dive report that extensively cross-references all evidence.",
    }.get(getattr(state, "level", "flash"), "")

    system_prompt_with_level = SYSTEM_PROMPT + f"\n\n### Intelligence Level: {getattr(state, 'level', 'flash').upper()}\nInstruction: {level_instruction}\n"

    messages = [
        {"role": "system", "content": system_prompt_with_level},
        {"role": "user", "content": user_prompt}
    ]

    report_content = None

    # Attempt LLM call with one retry
    for attempt in range(2):
        try:
            report_content = await call_llm(
                messages=messages,
                model=REPORT_MODEL,
                timeout=120.0  # give super model extra time
            )
            break
        except Exception as e:
            print(f"[Stage 6] LLM call failed (attempt {attempt + 1}): {e}")

    # Fallback: generate minimal report from raw evidence if LLM fails
    if not report_content:
        print("[Stage 6] LLM failed. Generating minimal fallback report.")
        report_content = _generate_fallback_report(state)

    # Save report to disk
    os.makedirs(REPORTS_DIR, exist_ok=True)
    report_path = os.path.join(REPORTS_DIR, f"{state.investigation_id}.md")

    try:
        with open(report_path, "w", encoding="utf-8") as f:
            f.write(report_content)
        state.final_report = report_path
        print(f"[Stage 6] Report saved to: {report_path}")
    except Exception as e:
        print(f"[Stage 6] Disk write failed: {e}. Embedding report in SSE.")
        # Fallback: push report content directly in the SSE event
        await _push_sse(state, {
            "type": "report",
            "status": "completed",
            "content": report_content
        })
        return

    # Emit report completion SSE event
    await _push_sse(state, {
        "type": "report",
        "status": "completed",
        "investigation_id": state.investigation_id
    })
    print("[Stage 6] Report generation complete.")


def _build_evidence_summary(state: InvestigationState) -> str:
    """Build a condensed evidence text for the LLM prompt."""
    lines = []
    for i, ev in enumerate(state.evidence[:40]):  # Cap at 40 facts to stay within context
        fact = ev.get("fact", "")
        sources = ", ".join(ev.get("sources", []))
        authority = ev.get("authority", "unknown")
        lines.append(f"{i+1}. [{authority.upper()}] {fact} (Sources: {sources})")
    return "\n".join(lines) if lines else "No verified evidence collected."


def _generate_fallback_report(state: InvestigationState) -> str:
    """Minimal Python-generated report if all LLM calls fail."""
    lines = [
        f"# Investigation Report: {state.objective}",
        "",
        "## Executive Summary",
        f"This investigation on '{state.query}' gathered {len(state.evidence)} verified facts across {state.iteration} iteration(s).",
        "",
        "## Key Findings",
    ]
    for ev in state.evidence[:20]:
        lines.append(f"- {ev.get('fact', '')} (Authority: {ev.get('authority', 'unknown')})")

    lines += [
        "",
        "## Claims",
    ]
    for c in state.claims[:10]:
        lines.append(f"- {c}")

    lines += [
        "",
        "## Confidence",
        f"Overall: {state.confidence.get('overall', 'N/A')}%",
        "",
        "## Limitations",
    ]
    for gap in state.missing_topics:
        lines.append(f"- {gap}")

    return "\n".join(lines)


async def _push_sse(state: InvestigationState, event: dict) -> None:
    """Push an SSE event to the client stream, injecting timestamp if missing."""
    if state.sse_queue is None:
        return
    from datetime import datetime, timezone
    if "timestamp" not in event:
        event = {**event, "timestamp": datetime.now(timezone.utc).isoformat()}
    # Ensure timeline events always have a kind
    if event.get("type") == "timeline" and "kind" not in event:
        event = {**event, "kind": "info"}
    await state.sse_queue.put(event)

    # Append timeline events to state.audit_log for the REST /audit endpoint
    if event.get("type") == "timeline":
        import uuid as _uuid
        state.audit_log.append({
            "id":        f"audit-{_uuid.uuid4().hex[:8]}",
            "timestamp": event["timestamp"],
            "message":   event.get("message", ""),
            "kind":      event.get("kind", "info"),
        })
