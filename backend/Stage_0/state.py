import dataclasses
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any
import uuid
import os
import json


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# Path to the directory where states will be saved
STATES_DIR = os.path.join(os.path.dirname(__file__), "states")


@dataclass
class InvestigationState:
    investigation_id: str
    query: str
    status: str = "pending"  # pending | running | completed | error

    # Timestamps
    created_at: str = field(default_factory=_now_iso)

    # Intelligence level (flash | medium | ultra)
    level: str = "flash"
    
    # Investigation type (legacy, fallback)
    inv_type: str = "topic"

    # Stage 1 — Planner output
    objective: str = ""
    strategy: str = ""
    search_queries: list[str] = field(default_factory=list)
    dimensions: list[str] = field(default_factory=list)

    # Stage 2 — Raw Tavily results (replaced each iteration)
    raw_results: list[dict] = field(default_factory=list)

    # Stage 3 — Extracted documents
    documents: list[dict] = field(default_factory=list)

    # Stage 4 — Evidence & Gaps
    evidence: list[dict] = field(default_factory=list)
    claims: list[str] = field(default_factory=list)
    contradictions: list[str] = field(default_factory=list)
    missing_topics: list[str] = field(default_factory=list)
    knowledge_coverage: dict[str, int] = field(default_factory=dict)
    confidence: dict[str, int] = field(default_factory=dict)

    # Stage 6 — Final report
    final_report: str = ""  # path to the saved .md report file

    # Loop control
    iteration: int = 1
    all_searched_queries: list[str] = field(default_factory=list)

    # Pipeline stage metadata: stage_id → {status, startedAt, completedAt, detail}
    stage_meta: dict[str, dict] = field(default_factory=dict)

    # Audit log for GET /api/investigation/{id}/audit
    audit_log: list[dict] = field(default_factory=list)

    # SSE queue — main.py attaches asyncio.Queue here at runtime
    sse_queue: Any = None

    # Track if initialization is complete
    _initialized: bool = field(default=False, init=False, repr=False)

    def __post_init__(self):
        self._initialized = True

    def __setattr__(self, name, value):
        super().__setattr__(name, value)
        # Auto-save state if initialized and not modifying sse_queue
        if getattr(self, "_initialized", False) and name != "sse_queue":
            try:
                save_state(self)
            except Exception as e:
                print(f"[state] Auto-save error: {e}")


# Global registry: investigation_id → InvestigationState
investigations: dict[str, InvestigationState] = {}


def save_state(state: InvestigationState) -> None:
    """Serialize InvestigationState to JSON (excluding sse_queue) and save to disk."""
    try:
        os.makedirs(STATES_DIR, exist_ok=True)
        filepath = os.path.join(STATES_DIR, f"{state.investigation_id}.json")
        
        # Serialize fields manually to avoid pickling issues with sse_queue
        state_dict = {
            f.name: getattr(state, f.name)
            for f in dataclasses.fields(state)
            if f.name != "sse_queue" and f.name != "_initialized"
        }
        
        # Write atomically using a temp file
        temp_filepath = filepath + ".tmp"
        with open(temp_filepath, "w", encoding="utf-8") as f:
            json.dump(state_dict, f, indent=2, ensure_ascii=False)
        os.replace(temp_filepath, filepath)
    except Exception as e:
        print(f"[state] Error saving state: {e}")


def load_state_from_disk(investigation_id: str) -> InvestigationState | None:
    """Load and reconstruct InvestigationState from JSON file on disk."""
    try:
        filepath = os.path.join(STATES_DIR, f"{investigation_id}.json")
        if not os.path.exists(filepath):
            return None
        with open(filepath, "r", encoding="utf-8") as f:
            state_dict = json.load(f)
            
        # Get only fields valid for current dataclass definition
        import inspect
        sig = inspect.signature(InvestigationState)
        valid_fields = set(sig.parameters.keys())
        filtered_dict = {k: v for k, v in state_dict.items() if k in valid_fields}
        
        state = InvestigationState(**filtered_dict)
        return state
    except Exception as e:
        print(f"[state] Error loading state from disk: {e}")
        return None


def create_investigation(query: str, level: str = "flash") -> InvestigationState:
    """Create and register a new investigation."""
    inv_id = str(uuid.uuid4())
    state = InvestigationState(
        investigation_id=inv_id,
        query=query,
        status="pending",
        level=level
    )
    investigations[inv_id] = state
    save_state(state)
    return state


def get_investigation(investigation_id: str) -> InvestigationState | None:
    state = investigations.get(investigation_id)
    if state is not None:
        return state
    
    # Try loading from disk
    state = load_state_from_disk(investigation_id)
    if state is not None:
        # Cache in memory
        investigations[investigation_id] = state
    return state


def get_all_investigations() -> list[dict]:
    """Return a summary of all investigations from memory and disk."""
    results = []
    # Find all JSON files in the STATES_DIR
    if os.path.exists(STATES_DIR):
        for filename in os.listdir(STATES_DIR):
            if filename.endswith(".json"):
                inv_id = filename[:-5]
                state = get_investigation(inv_id)
                if state:
                    results.append({
                        "id": state.investigation_id,
                        "objective": state.objective or state.query,
                        "status": state.status,
                        "confidence": state.confidence.get("overall", 0),
                        "createdAt": state.created_at,
                    })
    # Sort by created_at descending
    results.sort(key=lambda x: x["createdAt"], reverse=True)
    return results
