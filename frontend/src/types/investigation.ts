// ---------------------------------------------------------------------------
// Core domain types for IntelDesk.
// The backend team should treat this file as the contract: real API
// responses should be shaped to match these interfaces so that no
// component code needs to change when services/api.ts is wired to a
// live backend.
// ---------------------------------------------------------------------------

export type InvestigationType = "flash" | "medium" | "ultra";

export type InvestigationStatus = "running" | "completed" | "failed" | "paused";

export type StageStatus = "pending" | "running" | "completed" | "failed";

export interface PipelineStage {
  id: string;
  label: string;
  status: StageStatus;
  startedAt?: string;
  completedAt?: string;
  detail?: string;
}

export interface Investigation {
  id: string;
  objective: string;
  type: InvestigationType;
  status: InvestigationStatus;
  createdAt: string;
  confidence: number; // 0-100
  stages: PipelineStage[];
}

export type SourceType =
  | "news"
  | "government"
  | "academic"
  | "company"
  | "social"
  | "blog"
  | "court_record"
  | "industry_report";

export type VerificationStatus = "verified" | "pending" | "rejected";

export interface EvidenceItem {
  id: string;
  sourceName: string;
  sourceType: SourceType;
  url: string;
  credibility: number; // 0-100
  publishedAt: string;
  verification: VerificationStatus;
  confidence: number; // 0-100
  excerpt?: string;
}

export interface TrustMetric {
  id: string;
  label: string;
  value: number; // 0-100
  description: string;
}

export interface AuditEvent {
  id: string;
  timestamp: string;
  message: string;
  kind: "info" | "success" | "warning" | "error";
}

export interface Contradiction {
  id: string;
  claimA: { text: string; source: string };
  claimB: { text: string; source: string };
  resolution: string;
  updatedConfidence: number;
}

export interface ExplainabilitySection {
  id: string;
  question: string;
  evidenceUsed: string[];
  reasoningSteps: string[];
  alternativePossibilities: string[];
  confidence: number;
  limitations: string[];
}

export type RiskLevel = "low" | "medium" | "high";

export interface ExecutiveSummary {
  summary: string;
  confidence: number;
  keyFindings: string[];
  riskLevel: RiskLevel;
  recommendedActions: string[];
}

export interface CoverageItem {
  id: string;
  label: string;
  complete: boolean;
}

export interface Limitation {
  id: string;
  text: string;
}

export interface InvestigationReport {
  investigationId: string;
  generatedAt: string;
  executiveSummary: ExecutiveSummary;
  coverage: CoverageItem[];
  limitations: Limitation[];
  markdown: string;
}

// ---------------------------------------------------------------------------
// Live event stream contract (SSE, WebSocket fallback).
// Mirrors the backend's planned event shapes so the mock stream and the
// eventual real stream can share one consumer: useInvestigationStream.
// ---------------------------------------------------------------------------

export type LiveEvent =
  | { type: "planner"; task: string; timestamp: string }
  | { type: "search"; query: string; timestamp: string }
  | { type: "url"; url: string; domain: string; status: VerificationStatus; timestamp: string }
  | { type: "browser"; url: string; timestamp: string }
  | { type: "stage"; stageId: string; status: StageStatus; timestamp: string }
  | { type: "confidence"; value: number; timestamp: string }
  | { type: "gap"; message: string; timestamp: string }
  | { type: "timeline"; message: string; kind: AuditEvent["kind"]; timestamp: string }
  | { type: "report"; status: "completed"; timestamp: string };
