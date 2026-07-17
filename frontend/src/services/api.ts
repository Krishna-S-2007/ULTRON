// ---------------------------------------------------------------------------
// services/api.ts — LIVE backend integration
//
// All functions now call the real FastAPI backend at /api/*.
// The Vite dev proxy routes /api/* → http://127.0.0.1:8000/api/*.
// ---------------------------------------------------------------------------

import type {
  Investigation,
  InvestigationType,
  EvidenceItem,
  AuditEvent,
  TrustMetric,
  InvestigationReport,
  Contradiction,
  ExplainabilitySection,
  LiveEvent,
} from "@/types/investigation";

const BASE = "/api";

// ─── helpers ──────────────────────────────────────────────────────────────

async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API ${url} → ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

// ─── POST /api/investigate ─────────────────────────────────────────────────

export async function startInvestigation(
  objective: string,
  level: InvestigationType
): Promise<{ investigationId: string }> {
  const data = await apiFetch<{ investigation_id: string }>(`${BASE}/investigate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: objective, level }),
  });
  // Backend returns snake_case; normalise to camelCase for the frontend
  return { investigationId: data.investigation_id };
}

// ─── GET /api/investigation/{id} ───────────────────────────────────────────

export async function getInvestigation(investigationId: string): Promise<Investigation> {
  return apiFetch<Investigation>(`${BASE}/investigation/${investigationId}`);
}

// ─── GET /api/investigations ───────────────────────────────────────────────

export async function getInvestigations(): Promise<Investigation[]> {
  return apiFetch<Investigation[]>(`${BASE}/investigations`);
}

// ─── GET /api/investigation/{id}/evidence ──────────────────────────────────

export async function getEvidence(investigationId: string): Promise<EvidenceItem[]> {
  return apiFetch<EvidenceItem[]>(`${BASE}/investigation/${investigationId}/evidence`);
}

// ─── GET /api/investigation/{id}/audit ────────────────────────────────────

export async function getAuditTrail(investigationId: string): Promise<AuditEvent[]> {
  return apiFetch<AuditEvent[]>(`${BASE}/investigation/${investigationId}/audit`);
}

// ─── GET /api/investigation/{id}/metrics ──────────────────────────────────

export async function getMetrics(investigationId: string): Promise<TrustMetric[]> {
  return apiFetch<TrustMetric[]>(`${BASE}/investigation/${investigationId}/metrics`);
}

// ─── GET /api/investigation/{id}/contradictions ────────────────────────────

export async function getContradictions(investigationId: string): Promise<Contradiction[]> {
  return apiFetch<Contradiction[]>(`${BASE}/investigation/${investigationId}/contradictions`);
}

// ─── GET /api/investigation/{id}/explainability ───────────────────────────

export async function getExplainability(investigationId: string): Promise<ExplainabilitySection[]> {
  return apiFetch<ExplainabilitySection[]>(`${BASE}/investigation/${investigationId}/explainability`);
}

// ─── GET /api/report/{id} ─────────────────────────────────────────────────

export async function getReport(investigationId: string): Promise<InvestigationReport> {
  return apiFetch<InvestigationReport>(`${BASE}/report/${investigationId}`);
}

// ─── SSE: GET /api/investigation/{id}/stream ──────────────────────────────

/**
 * Opens an SSE connection to the backend and forwards every parsed LiveEvent
 * to the provided callback. Returns a cleanup function that closes the source.
 *
 * Unknown or malformed events are silently ignored so new backend event types
 * cannot crash the UI.
 */
export function streamInvestigation(
  investigationId: string,
  onEvent: (event: LiveEvent) => void
): () => void {
  const source = new EventSource(`${BASE}/investigation/${investigationId}/stream`);

  source.onmessage = (e) => {
    try {
      const parsed = JSON.parse(e.data) as Record<string, unknown>;

      // Ignore internal backend events the UI doesn't handle
      if (!parsed || typeof parsed.type !== "string") return;
      const { type } = parsed;
      if (type === "heartbeat" || type === "done" || type === "error" ||
          type === "evidence" || type === "coverage" || type === "decision" ||
          type === "loop") return;

      // Coerce event to a LiveEvent. Backend normalisation is done in main.py;
      // here we only guarantee a timestamp exists.
      const ts = (parsed.timestamp as string) ?? new Date().toISOString();

      switch (type) {
        case "planner":
          onEvent({ type: "planner", task: (parsed.task as string) ?? "", timestamp: ts });
          break;
        case "search":
          onEvent({ type: "search", query: (parsed.query as string) ?? "", timestamp: ts });
          break;
        case "url":
          onEvent({
            type: "url",
            url: (parsed.url as string) ?? "",
            domain: (parsed.domain as string) ?? "",
            status: (parsed.status as "verified" | "pending" | "rejected") ?? "pending",
            timestamp: ts,
          });
          break;
        case "browser":
          onEvent({ type: "browser", url: (parsed.url as string) ?? "", timestamp: ts });
          break;
        case "stage":
          onEvent({
            type: "stage",
            stageId: (parsed.stageId as string) ?? "",
            status: (parsed.status as "pending" | "running" | "completed" | "failed") ?? "pending",
            timestamp: ts,
          });
          break;
        case "confidence":
          onEvent({ type: "confidence", value: (parsed.value as number) ?? 0, timestamp: ts });
          break;
        case "gap":
          onEvent({ type: "gap", message: (parsed.message as string) ?? "", timestamp: ts });
          break;
        case "timeline":
          onEvent({
            type: "timeline",
            message: (parsed.message as string) ?? "",
            kind: (parsed.kind as "info" | "success" | "warning" | "error") ?? "info",
            timestamp: ts,
          });
          break;
        case "report":
          onEvent({ type: "report", status: "completed", timestamp: ts });
          break;
        default:
          break;
      }
    } catch {
      // Malformed JSON — ignore silently
    }
  };

  source.onerror = () => {
    // Connection error / stream closed — EventSource retries automatically.
    // When the stream ends naturally (after "done"), the backend closes the
    // connection and EventSource will enter CLOSED state; no action needed.
  };

  return () => source.close();
}
