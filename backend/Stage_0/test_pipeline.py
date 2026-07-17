import asyncio
import os
import sys

# allow sibling dirs to be importable
sys.path.insert(0, os.path.dirname(__file__))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from state import create_investigation
from main import run_investigation

async def test_full_pipeline():
    query = "Tesla 4680 battery technology"
    print(f"Creating investigation for query: {query}")
    state = create_investigation(query)
    
    # Attach a mock queue to capture SSE events
    state.sse_queue = asyncio.Queue()
    
    print("\n[STARTING PIPELINE]")
    
    # Run the investigation as a background task
    task = asyncio.create_task(run_investigation(state))
    
    print("\n[STREAMING EVENTS]")
    try:
        while True:
            # wait for events to be pushed to the queue
            event = await asyncio.wait_for(state.sse_queue.get(), timeout=15.0)
            print(f"--> EVENT: {event}")
            if event.get("type") in ["done", "error"]:
                break
    except asyncio.TimeoutError:
        print("--> TIMEOUT: No event received in 15 seconds.")
        
    await task
    print("\n[PIPELINE COMPLETED]")
    print(f"State status: {state.status}")
    print(f"Stage 1 Output - Search Queries: {state.search_queries}")
    if hasattr(state, 'raw_results'):
        print(f"Stage 2 Output - Total Raw Results: {len(state.raw_results)}")
    if hasattr(state, 'documents'):
        print(f"Stage 3 Output - Total Extracted Documents: {len(state.documents)}")
        for i, doc in enumerate(state.documents[:3]): # print first three
            print(f"  Document {i+1}: {doc.get('url')} [Source: {doc.get('source')}]")
            print(f"    Content sample: {doc.get('content')[:150]}...")
            
    if hasattr(state, 'evidence'):
        print(f"Stage 4 Output:")
        print(f"  Total Evidence (Facts): {len(state.evidence)}")
        for i, ev in enumerate(state.evidence[:3]):
            print(f"    Fact {i+1}: {ev.get('fact')} (Authority: {ev.get('authority')}) [Sources: {ev.get('sources')}]")
        print(f"  Total Claims: {len(state.claims)}")
        for c in state.claims[:3]:
            print(f"    Claim: {c}")
        print(f"  Total Contradictions: {len(state.contradictions)}")
        for con in state.contradictions[:3]:
            print(f"    Contradiction: {con}")
        print(f"  Missing Topics (Gaps): {state.missing_topics}")
        print(f"  Confidence: {state.confidence}")
        print(f"  Knowledge Coverage: {state.knowledge_coverage}")

if __name__ == "__main__":
    asyncio.run(test_full_pipeline())
