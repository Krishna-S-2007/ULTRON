"""
extractor.py — Stage 3: Agentic Decision Node
Dynamically decides the best scraping strategy for each Tavily search result.
Validates lengths and uses Jina Reader (r.jina.ai) as a fallback for full Markdown extraction.
"""

import asyncio
import os
import sys
import httpx
from typing import Optional

# Allow importing from sibling directories
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from Stage_0.state import InvestigationState
from Stage_2.utils import get_domain

JINA_TIMEOUT = 5.0

async def run_extractor(state: InvestigationState) -> None:
    """
    Iterate over raw_results and apply the decision logic.
    For each result:
      - skip if blocked (already filtered in Stage 2, but just a safety check)
      - use_raw if raw_content > 300 chars
      - use_snippet if content > 300 chars
      - fetch_jina otherwise (calls r.jina.ai/URL)
    """
    print(f"[Stage 3] Starting Agentic Decision Node for {len(state.raw_results)} results...")
    await _push_timeline_event(state, f"Scraping and extracting content from {len(state.raw_results)} sources...", kind="info")

    # Clear previous documents for this iteration
    state.documents = []

    # Social media domains where Jina Reader is blocked / rate-limited or fails
    SOCIAL_DOMAINS = set()

    sem = asyncio.Semaphore(3)

    async def _process_result(result, client):
        url = result.get("url", "")
        domain = get_domain(url)
        
        raw_content = result.get("raw_content") or ""
        snippet = result.get("content") or ""
        
        action = "unknown"
        final_content = ""
        source = ""

        is_social = any(domain == s or domain.endswith("." + s) for s in SOCIAL_DOMAINS)

        if len(raw_content) > 300:
            action = "use_raw"
            final_content = raw_content
            source = "tavily_raw"
            await _push_timeline_event(state, f"Using pre-fetched raw HTML for: {url}", kind="info")
        elif len(snippet) > 300:
            action = "use_snippet"
            final_content = snippet
            source = "tavily_snippet"
        elif is_social:
            if len(snippet) > 0:
                action = "use_snippet_fallback"
                final_content = snippet
                source = "tavily_snippet_fallback"
            else:
                action = "skipped"
        else:
            action = "fetch_jina"
            print(f"[Stage 3] Fetching Jina Reader for: {url}")
            try:
                async with sem:
                    jina_url = f"https://r.jina.ai/{url}"
                    response = await client.get(jina_url)
                
                if response.status_code == 200:
                    jina_text = response.text
                    if len(jina_text) > 100:
                        final_content = jina_text
                        source = "jina"
                        await _push_timeline_event(state, f"Jina Reader successfully extracted full content for: {url}", kind="success")
                    else:
                        await _push_timeline_event(state, f"Jina returned insufficient content (<100 chars) for: {url}")
                        action = "skipped"
                else:
                    await _push_timeline_event(state, f"Jina returned error {response.status_code} for: {url}")
                    action = "skipped"
            except asyncio.TimeoutError:
                await _push_timeline_event(state, f"Jina timeout: {url}")
                action = "skipped"
            except Exception as e:
                await _push_timeline_event(state, f"Jina request failed for {url}: {e}")
                action = "skipped"

        if action != "skipped" and final_content:
            if len(final_content) > 15000:
                print(f"[Stage 3] Truncating content for {url} from {len(final_content)} to 15000 chars.")
                final_content = final_content[:15000] + "\n... [TRUNCATED DUE TO SIZE]"
            
            doc = {
                "url": url,
                "title": result.get("title", "Untitled Page"),
                "content": final_content,
                "source": source,
                "iteration": state.iteration
            }
            return doc, url, domain, action
        return None, url, domain, action

    async with httpx.AsyncClient(timeout=JINA_TIMEOUT) as client:
        tasks = [_process_result(r, client) for r in state.raw_results]
        processed_results = await asyncio.gather(*tasks)

        for doc, url, domain, action in processed_results:
            if doc:
                state.documents.append(doc)
            await _push_decision_sse(state, url, domain, action)
            
        state.documents = state.documents

    print(f"[Stage 3] Extraction complete. Stored {len(state.documents)} documents.")


async def _push_decision_sse(state: InvestigationState, url: str, domain: str, action: str) -> None:
    """Emit the decision event to client stream."""
    if state.sse_queue is None:
        return
    event = {
        "type": "decision",
        "url": url,
        "domain": domain,
        "action": action,
        "iteration": state.iteration,
    }
    await state.sse_queue.put(event)


async def _push_timeline_event(state: InvestigationState, message: str, kind: str = "warning") -> None:
    """Helper to emit an explanation timeline warning/update."""
    if state.sse_queue is None:
        return
    from datetime import datetime, timezone
    ts = datetime.now(timezone.utc).isoformat()
    event = {
        "type":      "timeline",
        "message":   message,
        "kind":      kind,
        "timestamp": ts,
    }
    await state.sse_queue.put(event)
    # Also append to audit_log
    import uuid as _uuid
    state.audit_log.append({
        "id":        f"audit-{_uuid.uuid4().hex[:8]}",
        "timestamp": ts,
        "message":   message,
        "kind":      "warning",
    })
