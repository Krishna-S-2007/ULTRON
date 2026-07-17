import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useInvestigationStream } from "@/hooks/useInvestigationStream";
import {
  getInvestigation,
  getEvidence,
  getMetrics,
  getAuditTrail,
  getContradictions,
  getExplainability,
  getReport,
} from "@/services/api";
import type {
  Investigation,
  EvidenceItem,
  TrustMetric,
  AuditEvent,
  Contradiction,
  ExplainabilitySection,
  InvestigationReport,
  LiveEvent,
} from "@/types/investigation";

interface ActiveInvestigationState {
  activeId: string | null;
  setActiveId: (id: string | null, objective?: string, type?: string) => void;
  
  loading: boolean;
  seed: Investigation | null;
  evidence: EvidenceItem[];
  metrics: TrustMetric[];
  baseAudit: AuditEvent[];
  contradictions: Contradiction[];
  explainability: ExplainabilitySection[];
  report: InvestigationReport | null;
  
  // Stream data
  investigation: Investigation | null;
  liveEvents: LiveEvent[];
  auditTrail: AuditEvent[];
  reportReady: boolean;
}

const ActiveInvestigationContext = createContext<ActiveInvestigationState | null>(null);

export function ActiveInvestigationProvider({ children }: { children: ReactNode }) {
  const [activeId, setInternalActiveId] = useState<string | null>(null);
  const [objective, setObjective] = useState<string | undefined>();
  const [type, setType] = useState<string | undefined>();
  
  const [seed, setSeed] = useState<Investigation | null>(null);
  const [evidence, setEvidence] = useState<EvidenceItem[]>([]);
  const [metrics, setMetrics] = useState<TrustMetric[]>([]);
  const [baseAudit, setBaseAudit] = useState<AuditEvent[]>([]);
  const [contradictions, setContradictions] = useState<Contradiction[]>([]);
  const [explainability, setExplainability] = useState<ExplainabilitySection[]>([]);
  const [report, setReport] = useState<InvestigationReport | null>(null);
  const [loading, setLoading] = useState(false);

  const setActiveId = (id: string | null, obj?: string, t?: string) => {
    if (id !== activeId) {
      setInternalActiveId(id);
      setObjective(obj);
      setType(t);
      // Reset state on new ID
      setSeed(null);
      setEvidence([]);
      setMetrics([]);
      setBaseAudit([]);
      setContradictions([]);
      setExplainability([]);
      setReport(null);
    }
  };

  useEffect(() => {
    if (!activeId) return;
    let active = true;
    setLoading(true);

    (async () => {
      try {
        const [inv, ev, m, audit, contras, explain] = await Promise.all([
          getInvestigation(activeId),
          getEvidence(activeId),
          getMetrics(activeId),
          getAuditTrail(activeId),
          getContradictions(activeId),
          getExplainability(activeId),
        ]);
        if (!active) return;
        
        setSeed({
          ...inv,
          objective: objective || inv.objective,
          type: (type as Investigation["type"]) || inv.type,
          stages: inv.stages,
          confidence: inv.confidence || 0,
        });
        setEvidence(ev);
        setMetrics(m);
        setBaseAudit(audit);
        setContradictions(contras);
        setExplainability(explain);
      } catch (err) {
        console.error("Failed to fetch investigation:", err);
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [activeId, objective, type]);

  // Hook into the stream - this now lives globally!
  const streamData = useInvestigationStream(seed);

  useEffect(() => {
    if (!streamData.reportReady || !activeId) return;
    (async () => {
      try {
        const [ev, m, contras, explain, rpt] = await Promise.all([
          getEvidence(activeId),
          getMetrics(activeId),
          getContradictions(activeId),
          getExplainability(activeId),
          getReport(activeId),
        ]);
        setEvidence(ev);
        setMetrics(m);
        setContradictions(contras);
        setExplainability(explain);
        setReport(rpt);
      } catch (err) {
        console.error("Failed to refetch final investigation data:", err);
      }
    })();
  }, [streamData.reportReady, activeId]);

  const value: ActiveInvestigationState = {
    activeId,
    setActiveId,
    loading,
    seed,
    evidence,
    metrics,
    baseAudit,
    contradictions,
    explainability,
    report,
    investigation: streamData.investigation,
    liveEvents: streamData.liveEvents,
    auditTrail: streamData.auditTrail,
    reportReady: streamData.reportReady,
  };

  return (
    <ActiveInvestigationContext.Provider value={value}>
      {children}
    </ActiveInvestigationContext.Provider>
  );
}

export function useActiveInvestigation() {
  const context = useContext(ActiveInvestigationContext);
  if (!context) {
    throw new Error("useActiveInvestigation must be used within an ActiveInvestigationProvider");
  }
  return context;
}
