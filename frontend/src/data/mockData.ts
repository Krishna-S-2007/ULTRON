import type {
  Investigation,
  EvidenceItem,
  TrustMetric,
  AuditEvent,
  Contradiction,
  ExplainabilitySection,
  ExecutiveSummary,
  CoverageItem,
  Limitation,
  InvestigationReport,
} from "@/types/investigation";

export const mockInvestigation: Investigation = {
  id: "INV-8841",
  objective: "Investigate Tesla ESG risks and battery supply chain exposure",
  type: "ultra",
  status: "running",
  createdAt: new Date(Date.now() - 1000 * 60 * 6).toISOString(),
  confidence: 87,
  stages: [
    { id: "scope", label: "Scope Analysis", status: "completed" },
    { id: "discovery", label: "Source Discovery", status: "completed" },
    { id: "validation", label: "Evidence Validation", status: "completed" },
    { id: "conflict", label: "Conflict Resolution", status: "running" },
    { id: "reasoning", label: "Reasoning", status: "pending" },
    { id: "report", label: "Report Generation", status: "pending" },
  ],
};

export const mockEvidence: EvidenceItem[] = [
  {
    id: "ev-1",
    sourceName: "Reuters",
    sourceType: "news",
    url: "https://reuters.com/business/tesla-battery-supply",
    credibility: 98,
    publishedAt: "2026-06-02",
    verification: "verified",
    confidence: 94,
    excerpt: "Reporting on cobalt sourcing shifts across major EV manufacturers.",
  },
  {
    id: "ev-2",
    sourceName: "SEC EDGAR — 10-K Filing",
    sourceType: "government",
    url: "https://sec.gov/edgar/tesla-10k",
    credibility: 100,
    publishedAt: "2026-02-14",
    verification: "verified",
    confidence: 99,
    excerpt: "Annual disclosure of supply chain and raw-material risk factors.",
  },
  {
    id: "ev-3",
    sourceName: "IEEE Transactions on Energy",
    sourceType: "academic",
    url: "https://ieeexplore.ieee.org/tesla-battery-thermal",
    credibility: 92,
    publishedAt: "2025-11-20",
    verification: "verified",
    confidence: 88,
    excerpt: "Peer-reviewed analysis of thermal degradation in 4680 cell architecture.",
  },
  {
    id: "ev-4",
    sourceName: "Tesla Impact Report",
    sourceType: "company",
    url: "https://tesla.com/impact-report-2026",
    credibility: 74,
    publishedAt: "2026-03-01",
    verification: "verified",
    confidence: 81,
    excerpt: "Company-published sustainability metrics and sourcing commitments.",
  },
  {
    id: "ev-5",
    sourceName: "EV Insider Blog",
    sourceType: "blog",
    url: "https://evinsiderblog.example.com/tesla-rumor",
    credibility: 23,
    publishedAt: "2026-06-10",
    verification: "rejected",
    confidence: 12,
    excerpt: "Unsourced speculation about undisclosed supplier relationships.",
  },
  {
    id: "ev-6",
    sourceName: "BloombergNEF Industry Report",
    sourceType: "industry_report",
    url: "https://about.bnef.com/battery-supply-chain-2026",
    credibility: 90,
    publishedAt: "2026-04-18",
    verification: "verified",
    confidence: 86,
    excerpt: "Cross-manufacturer benchmarking of battery supply chain resilience.",
  },
  {
    id: "ev-7",
    sourceName: "@evwatcher_247",
    sourceType: "social",
    url: "https://x.com/evwatcher_247/status/1234",
    credibility: 31,
    publishedAt: "2026-06-15",
    verification: "pending",
    confidence: 34,
    excerpt: "Unverified claim awaiting cross-reference against filings.",
  },
];

export const mockMetrics: TrustMetric[] = [
  { id: "trust", label: "Investigation Trust Score", value: 91, description: "Composite of authority, agreement, and coverage." },
  { id: "coverage", label: "Evidence Coverage", value: 78, description: "Share of relevant source categories reached." },
  { id: "transparency", label: "Transparency", value: 95, description: "Share of claims traceable to a cited source." },
  { id: "cross", label: "Cross Verification", value: 84, description: "Claims confirmed by 2+ independent sources." },
  { id: "consistency", label: "Consistency", value: 88, description: "Agreement rate across retrieved sources." },
];

export const mockAuditTrail: AuditEvent[] = [
  { id: "a1", timestamp: "10:20", message: "Investigation started", kind: "info" },
  { id: "a2", timestamp: "10:21", message: "Found 14 candidate sources", kind: "info" },
  { id: "a3", timestamp: "10:22", message: "Filtered 3 low-credibility sources", kind: "warning" },
  { id: "a4", timestamp: "10:23", message: "Detected contradiction in funding figures", kind: "warning" },
  { id: "a5", timestamp: "10:24", message: "Verified government filing (SEC 10-K)", kind: "success" },
  { id: "a6", timestamp: "10:25", message: "Cross-referenced academic source against IEEE index", kind: "success" },
  { id: "a7", timestamp: "10:26", message: "Generating executive report", kind: "info" },
];

export const mockContradiction: Contradiction = {
  id: "c1",
  claimA: { text: "Company raised $10M in Series C funding", source: "Reuters" },
  claimB: { text: "Company raised $12M in Series C funding", source: "Annual Report" },
  resolution: "Official SEC filing confirms $12M — the Reuters figure predates a follow-on tranche.",
  updatedConfidence: 96,
};

export const mockExplainability: ExplainabilitySection[] = [
  {
    id: "exp-1",
    question: "Why did the AI conclude supply chain risk is moderate rather than high?",
    evidenceUsed: [
      "SEC 10-K raw-material risk disclosures",
      "BloombergNEF battery supply chain benchmarking",
      "Tesla Impact Report sourcing commitments",
    ],
    reasoningSteps: [
      "Identified all disclosed supplier concentration figures",
      "Cross-checked against independent industry benchmarking",
      "Weighted company-published claims lower than filed disclosures",
      "Found no independent evidence contradicting the moderate-risk classification",
    ],
    alternativePossibilities: [
      "Risk could be understated if undisclosed suppliers exist",
      "Risk could be overstated if 2026 diversification efforts are further along than reported",
    ],
    confidence: 87,
    limitations: ["Private supplier contracts are not publicly accessible"],
  },
];

export const mockExecutiveSummary: ExecutiveSummary = {
  summary:
    "Tesla's battery supply chain shows moderate ESG exposure, concentrated in cobalt and nickel sourcing. Public disclosures and independent industry benchmarking are broadly consistent; one funding-figure contradiction was resolved via SEC filing. No high-severity undisclosed risks were identified within the scope of publicly available sources.",
  confidence: 91,
  keyFindings: [
    "Supplier concentration risk is moderate and trending downward year-over-year",
    "Government filings and independent benchmarks agree on core sourcing figures",
    "One funding-figure contradiction resolved with 96% confidence",
    "No court records or regulatory actions found related to sourcing practices",
  ],
  riskLevel: "medium",
  recommendedActions: [
    "Monitor Q3 supplier diversification disclosures",
    "Re-run investigation after next 10-Q filing",
    "Expand coverage to international regulatory filings",
  ],
};

export const mockCoverage: CoverageItem[] = [
  { id: "cov-1", label: "Company Data", complete: true },
  { id: "cov-2", label: "Government Data", complete: true },
  { id: "cov-3", label: "News", complete: true },
  { id: "cov-4", label: "Research Papers", complete: true },
  { id: "cov-5", label: "Court Records", complete: false },
  { id: "cov-6", label: "Social Media", complete: false },
  { id: "cov-7", label: "Industry Reports", complete: true },
];

export const mockLimitations: Limitation[] = [
  { id: "lim-1", text: "Private supplier databases were unavailable within this investigation's scope" },
  { id: "lim-2", text: "Court records were only partially searchable at time of execution" },
  { id: "lim-3", text: "International regulatory filings outside the U.S. and E.U. were not searched" },
];

export const mockReport: InvestigationReport = {
  investigationId: "INV-8841",
  generatedAt: new Date().toISOString(),
  executiveSummary: mockExecutiveSummary,
  coverage: mockCoverage,
  limitations: mockLimitations,
  markdown: `# Tesla ESG & Battery Supply Chain — Investigation Report

**Investigation ID:** INV-8841
**Confidence:** 91%
**Risk Level:** Medium

## Executive Summary

${mockExecutiveSummary.summary}

## Key Findings

${mockExecutiveSummary.keyFindings.map((f) => `- ${f}`).join("\n")}

## Evidence Coverage

${mockCoverage.map((c) => `- [${c.complete ? "x" : " "}] ${c.label}`).join("\n")}

## Limitations

${mockLimitations.map((l) => `- ${l.text}`).join("\n")}

## Recommended Next Actions

${mockExecutiveSummary.recommendedActions.map((a) => `- ${a}`).join("\n")}
`,
};

/** Example objectives shown on the Home screen as quick-start suggestions. */
export const exampleObjectives = [
  "Investigate Tesla ESG risks",
  "Investigate OpenAI partnerships",
  "Analyze Company X reputation",
];
