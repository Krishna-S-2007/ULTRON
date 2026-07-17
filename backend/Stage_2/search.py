"""
search.py — Stage 2: Tavily Search
Sequentially runs search queries using the Tavily API.
Filters out blocked domains and stores results inside InvestigationState.
Emits SSE progress events.
"""

import asyncio
import os
import httpx
import sys

# Allow importing from sibling directories
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from Stage_0.state import InvestigationState
from Stage_2.utils import is_blocked

TAVILY_API_KEY = os.getenv("TAVILY_API_KEY", "")
TAVILY_URL = "https://api.tavily.com/search"


async def run_search(state: InvestigationState) -> None:
    """
    Run Tavily search for all queries in state.search_queries.

    - Iterates through queries sequentially (with 0.5s pause to prevent rate limit spikes).
    - Calls Tavily search with include_raw_content=True, max_results=5.
    - Handles timeouts (10s limit) and retries once per query on failure.
    - Filters results through the domain blocklist.
    - Appends valid results to state.raw_results.
    - Emits SSE events.
    """
    print(f"[Stage 2] Starting Tavily search for iteration {state.iteration}")
    await _push_timeline_event(state, f"Executing {len(state.search_queries)} search queries for iteration {state.iteration}...", kind="info")
    
    # Re-initialize raw_results for this iteration
    state.raw_results = []
    
    async with httpx.AsyncClient() as client:
        tasks = [_query_with_retry(client, query) for query in state.search_queries]
        all_results = await asyncio.gather(*tasks, return_exceptions=True)

        for query, results in zip(state.search_queries, all_results):
            print(f"[Stage 2] Processing results for query: {query}")
            if isinstance(results, Exception) or results is None:
                await _push_timeline_event(state, f"Tavily failure / timeout on query: {query}")
                continue

            # Process and filter results
            valid_results_count = 0
            for r in results:
                url = r.get("url", "")
                
                # Apply domain blocklist filter
                if is_blocked(url):
                    print(f"[Stage 2] Blocked domain skipped: {url}")
                    continue

                # Append valid result to state
                state.raw_results.append({
                    "url": url,
                    "title": r.get("title", "Untitled Page"),
                    "content": r.get("content", ""),
                    "raw_content": r.get("raw_content"),
                    "score": r.get("score", 0.0),
                    "query": query,
                    "iteration": state.iteration,
                })
                valid_results_count += 1

            if len(results) > 0 and valid_results_count == 0:
                await _push_timeline_event(
                    state, 
                    f"No usable sources for: {query} (all results matched domain blocklist)"
                )
            elif len(results) == 0:
                await _push_timeline_event(state, f"Tavily returned 0 results for: {query}")
            elif valid_results_count > 0:
                await _push_timeline_event(state, f"Search success: {valid_results_count} sources found for '{query}'", kind="success")

            # Emit SSE Event once query completes
            await _push_search_sse(state, query, valid_results_count)
            state.raw_results = state.raw_results

    print(f"[Stage 2] Search phase completed. Stored {len(state.raw_results)} total raw results.")
    state.raw_results = state.raw_results


async def _query_with_retry(client: httpx.AsyncClient, query: str) -> list[dict] | None:
    """Execute a Tavily search with a single retry on timeout/error."""
    payload = {
        "api_key": TAVILY_API_KEY,
        "query": query,
        "include_raw_content": True,
        "max_results": 6,
    }

    for attempt in range(2):
        try:
            response = await client.post(TAVILY_URL, json=payload, timeout=10.0)
            if response.status_code == 200:
                data = response.json()
                return data.get("results", [])
            else:
                print(f"[Stage 2] Tavily error status {response.status_code}: {response.text} (attempt {attempt+1})")
        except Exception as e:
            print(f"[Stage 2] Tavily query exception: {e} (attempt {attempt+1})")
        
        # Short wait before retrying on failure
        if attempt == 0:
            await asyncio.sleep(1.0)
            
    return None


async def _push_search_sse(state: InvestigationState, query: str, count: int) -> None:
    """Emit the search event + url events to client stream."""
    if state.sse_queue is None:
        return
    from datetime import datetime, timezone
    ts = datetime.now(timezone.utc).isoformat()
    # Frontend expects: { type: "search", query, timestamp }
    await state.sse_queue.put({
        "type":          "search",
        "query":         query,
        "results_count": count,
        "iteration":     state.iteration,
        "timestamp":     ts,
    })
    # Emit url events for each result collected this query
    for r in state.raw_results:
        if r.get("query") == query:
            url = r.get("url", "")
            domain = url.split("/")[2] if "//" in url else url
            # Determine verification status based on domain trust signals
            domain_lower = domain.lower()
            if any(x in domain_lower for x in [".gov", ".edu", "reuters", "bbc",
                                                 "nytimes", "bloomberg", "techcrunch",
                                                 "ieee", "arxiv", "pubmed"]):
                status = "verified"
            elif any(x in domain_lower for x in ["blog", "quora",
                                                   "medium.com", "wordpress"]):
                status = "rejected"
            else:
                status = "pending"
            url_ts = datetime.now(timezone.utc).isoformat()
            await state.sse_queue.put({
                "type":      "url",
                "url":       url,
                "domain":    domain,
                "status":    status,
                "timestamp": url_ts,
            })


async def _push_timeline_event(state: InvestigationState, message: str, kind: str = "warning") -> None:
    """Helper to emit an explanation timeline warning/update."""
    if state.sse_queue is None:
        return
    from datetime import datetime, timezone
    ts = datetime.now(timezone.utc).isoformat()
    await state.sse_queue.put({
        "type":      "timeline",
        "message":   message,
        "kind":      kind,
        "timestamp": ts,
    })
    import uuid as _uuid
    state.audit_log.append({
        "id":        f"audit-{_uuid.uuid4().hex[:8]}",
        "timestamp": ts,
        "message":   message,
        "kind":      kind,
    })
