import asyncio
import json
import sys
import os

# Allow importing from sibling directories
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from Stage_0.state import InvestigationState
from Stage_1.llm_client import call_llm

ANALYZER_MODEL = "nemotron-3-super-120b"  # switched from nano-reasoning for better reliability
CHUNK_CHAR_LIMIT = 80000

SYSTEM_PROMPT = """You are a highly analytical Evidence Synthesizer and Gap Detector.
Your task is to analyze scraped documents and extract structured intelligence.

### Instructions
1. **Deduplicate facts**: If the same fact appears in multiple sources, record it once and list all corroborating source domains in the `sources` array.
2. **Extract claims**: Unverified but important statements made by companies or individuals.
3. **Identify contradictions**: Find conflicting information between sources (e.g., Source A says X, Source B says Y).
4. **Detect knowledge gaps**: Identify critical missing topics (`missing_topics`) that need to be searched next to complete the investigation.
5. **Authority Scoring Rubric**:
   - High authority: .gov, .edu, .org (established), major news outlets (reuters, bbc, nytimes, techcrunch)
   - Medium authority: Industry blogs, company press releases, Wikipedia
   - Low authority: Unknown domains, personal blogs, forums, undated articles
   Assign one of: "high", "medium", or "low" to each fact based on the highest authority source corroborating it.

6. **Output Format**: You MUST output purely valid JSON with the following schema:
{
  "evidence": [
    {
      "fact": "fact description",
      "sources": ["domain1.com", "domain2.org"],
      "authority": "high|medium|low"
    }
  ],
  "claims": ["claim 1", "claim 2"],
  "contradictions": ["contradiction 1", "contradiction 2"],
  "missing_topics": ["gap 1", "gap 2"],
  "knowledge_coverage": {
    "official": 85,
    "academic": 55,
    "news": 70,
    "blogs": 10
  },
  "confidence": {
    "overall": 75,
    "authority": 88,
    "agreement": 72,
    "coverage": 65,
    "recency": 80,
    "contradictions_penalty": 5
  }
}

Output ONLY the JSON object. Do not include markdown formatting or explanations.
"""

async def run_analyzer(state: InvestigationState) -> None:
    print(f"[Stage 4] Starting Evidence Analyzer on {len(state.documents)} documents...")
    
    if not state.documents:
        print("[Stage 4] No documents to analyze. Skipping.")
        return

    # Compile the text content
    compiled_texts = []
    for doc in state.documents:
        source_domain = doc.get("url", "").split("/")[2] if "//" in doc.get("url", "") else "unknown"
        content = doc.get("content") or ""
        if len(content) > 1500:
            content = content[:1500] + "\n... [TRUNCATED FOR VALIDATION]"
        compiled_texts.append(f"--- Source: {source_domain} ---\n{content}")

    full_text = "\n\n".join(compiled_texts)
    
    # Chunking logic (simple character cutoff for now)
    chunks = []
    while len(full_text) > 0 and len(chunks) < 3:
        chunks.append(full_text[:CHUNK_CHAR_LIMIT])
        full_text = full_text[CHUNK_CHAR_LIMIT:]
    if len(full_text) > 0:
        print(f"[Stage 4] Warning: Capped processing at 3 chunks. Remaining {len(full_text)} characters discarded.")

    print(f"[Stage 4] Split documents into {len(chunks)} chunks for LLM processing.")

    for i, chunk in enumerate(chunks):
        print(f"[Stage 4] Processing chunk {i+1}/{len(chunks)}...")
        user_prompt = f"Objective: {state.objective}\n\nHere are the documents to analyze:\n\n{chunk}"
        
        parsed_data = None
        for attempt in range(2):
            try:
                messages = [
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": user_prompt}
                ]
                response_text = await call_llm(
                    messages=messages,
                    model=ANALYZER_MODEL,
                    timeout=180.0  # 3 min — large chunks need more time
                )
                
                # Cleanup potential markdown ticks from the response
                if response_text.startswith("```json"):
                    response_text = response_text[7:]
                if response_text.startswith("```"):
                    response_text = response_text[3:]
                if response_text.endswith("```"):
                    response_text = response_text[:-3]

                parsed_data = json.loads(response_text.strip())
                break
            except json.JSONDecodeError as e:
                print(f"[Stage 4] JSON decode error (Attempt {attempt+1}): {e}")
                if attempt == 1:
                    print("[Stage 4] Failed to parse JSON from LLM after 2 attempts.")
            except Exception as e:
                print(f"[Stage 4] Exception during LLM call: {e}")
        
        if parsed_data:
            _merge_parsed_data(state, parsed_data)
        else:
            if not state.missing_topics:
                # Failsafe values if everything fails
                state.missing_topics = []
                state.confidence = {"overall": 50, "authority": 50, "agreement": 50, "coverage": 50, "recency": 50, "contradictions_penalty": 0}

    # Clear heavy raw documents from memory
    state.documents = []
    print(f"[Stage 4] Memory cleared. Kept {len(state.evidence)} facts.")
    
    # Emit SSE events
    await _push_evidence_events(state)

def _merge_parsed_data(state: InvestigationState, data: dict):
    """Merge the JSON data into the central state object."""
    state.evidence.extend(data.get("evidence", []))
    state.claims.extend(data.get("claims", []))
    state.contradictions.extend(data.get("contradictions", []))
    
    # Merge missing topics (simple deduplication)
    for topic in data.get("missing_topics", []):
        if topic not in state.missing_topics:
            state.missing_topics.append(topic)
            
    # Naive merge of dictionaries (taking the most recent chunk's estimates for now)
    if "knowledge_coverage" in data:
        state.knowledge_coverage = data["knowledge_coverage"]
    if "confidence" in data:
        conf = data["confidence"]
        # Enforce exact confidence math based only on credibility
        auth = conf.get("authority", 50)
        rec = conf.get("recency", 50)
        conf["overall"] = max(0, min(100, int((auth + rec) / 2)))
        state.confidence = conf

    # Force auto-save by reassigning lists
    state.evidence = state.evidence
    state.claims = state.claims
    state.contradictions = state.contradictions
    state.missing_topics = state.missing_topics

async def _push_evidence_events(state: InvestigationState) -> None:
    if state.sse_queue is None:
        return
    from datetime import datetime, timezone

    def _ts() -> str:
        return datetime.now(timezone.utc).isoformat()

    # 1. Evidence summary event (internal — frontend ignores)
    await state.sse_queue.put({
        "type":            "evidence",
        "facts_count":     len(state.evidence),
        "claims_count":    len(state.claims),
        "contradictions":  len(state.contradictions),
        "iteration":       state.iteration,
        "timestamp":       _ts(),
    })

    # 2. Confidence event — frontend expects { type, value, timestamp }
    overall = state.confidence.get("overall", 0)
    await state.sse_queue.put({
        "type":      "confidence",
        "value":     overall,
        "timestamp": _ts(),
    })

    # 3. Gap event — frontend expects { type, message, timestamp }
    if state.missing_topics:
        gap_msg = f"Knowledge gaps found: {', '.join(state.missing_topics[:3])}"
        if len(state.missing_topics) > 3:
            gap_msg += f" (+{len(state.missing_topics) - 3} more)"
        await state.sse_queue.put({
            "type":      "gap",
            "message":   gap_msg,
            "timestamp": _ts(),
        })

    # 4. Coverage event (internal)
    await state.sse_queue.put({
        "type":      "coverage",
        "timestamp": _ts(),
        **state.knowledge_coverage,
    })

    # 5. Timeline summary — frontend expects { type, message, kind, timestamp }
    overall_conf = state.confidence.get("overall", 0)
    gaps_count   = len(state.missing_topics)
    msg = (f"Iteration {state.iteration} complete. "
           f"Confidence: {overall_conf}%. "
           f"{gaps_count} knowledge gap{'s' if gaps_count != 1 else ''} found.")
    kind = "success" if overall_conf >= 75 else "warning" if gaps_count > 0 else "info"
    tl_event = {
        "type":      "timeline",
        "message":   msg,
        "kind":      kind,
        "timestamp": _ts(),
    }
    await state.sse_queue.put(tl_event)

    # Also append to state.audit_log for REST /audit endpoint
    import uuid as _uuid
    state.audit_log.append({
        "id":        f"audit-{_uuid.uuid4().hex[:8]}",
        "timestamp": _ts(),
        "message":   msg,
        "kind":      kind,
    })
