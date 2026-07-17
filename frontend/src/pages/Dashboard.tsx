import { useEffect, useState } from "react";
import { useParams, useLocation } from "react-router-dom";
import { Info } from "lucide-react";
import { motion } from "framer-motion";
import { InvestigationHeader } from "@/components/investigation/InvestigationHeader";
import { ExecutionPipeline } from "@/components/investigation/ExecutionPipeline";
import { EvidencePanel } from "@/components/investigation/EvidencePanel";
import { TrustMetrics } from "@/components/investigation/TrustMetrics";
import { AuditTimeline } from "@/components/investigation/AuditTimeline";
import { LiveActivityFeed } from "@/components/investigation/LiveActivityFeed";
import { ContradictionCard } from "@/components/investigation/ContradictionCard";
import { ExplainabilityPanel } from "@/components/investigation/ExplainabilityPanel";
import { ExecutiveSummaryCard } from "@/components/investigation/ExecutiveSummary";
import { CoverageChecklist } from "@/components/investigation/CoverageChecklist";
import { LimitationsCard } from "@/components/investigation/LimitationsCard";
import { ReportPanel } from "@/components/investigation/ReportPanel";
import { CardSkeleton } from "@/components/common/LoadingSkeleton";
import { useInvestigationState } from "@/context/InvestigationStateContext";
import type { InvestigationState } from "@/context/InvestigationStateContext";
import { useActiveInvestigation } from "@/context/ActiveInvestigationContext";

const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { duration: 0.35, delay: i * 0.05 } }),
};

/**
 * Maps a pipeline stage label to an InvestigationState for the ribbon.
 * BACKEND WIRING: If stage IDs/labels change, update this map accordingly.
 */
function stageToRibbonState(stageId: string | undefined): InvestigationState {
  if (!stageId) return "idle";
  const id = stageId.toLowerCase();
  if (id.includes("plan"))    return "planning";
  if (id.includes("search"))  return "searching";
  if (id.includes("verif"))   return "verifying";
  if (id.includes("reason") || id.includes("analyz") || id.includes("think")) return "reasoning";
  if (id.includes("report") || id.includes("generat")) return "report";
  if (id.includes("complet") || id.includes("done"))   return "completed";
  return "searching"; // default active state
}

export default function Dashboard() {
  const { id } = useParams();
  const location = useLocation() as { state?: { objective?: string; type?: string } };

  // Ribbon background state broadcaster
  const { setInvestigationState } = useInvestigationState();

  const {
    activeId,
    setActiveId,
    loading,
    evidence,
    metrics,
    baseAudit,
    contradictions,
    explainability,
    report,
    investigation,
    liveEvents,
    auditTrail,
  } = useActiveInvestigation();

  const [reportOpen, setReportOpen] = useState(false);

  useEffect(() => {
    if (id) {
      setActiveId(id, location.state?.objective, location.state?.type);
    }
  }, [id, location.state, setActiveId]);

  // ── Broadcast ribbon state from live investigation stage events ──────────
  // BACKEND WIRING: This effect maps live stage IDs to ribbon states.
  // When the real SSE stream sends stage events, this hook picks them up
  // automatically through useInvestigationStream → liveEvents.
  useEffect(() => {
    if (!investigation) return;
    const activeStage = investigation.stages.find((s) => s.status === "running");
    const completedAll = investigation.stages.every(
      (s) => s.status === "completed" || s.status === "failed"
    );
    if (completedAll && investigation.status === "completed") {
      setInvestigationState("completed");
    } else if (activeStage) {
      setInvestigationState(stageToRibbonState(activeStage.id));
    } else if (investigation.status === "running") {
      setInvestigationState("planning");
    }
  }, [investigation, setInvestigationState]);

  // Set idle when the dashboard unmounts (navigating away)
  useEffect(() => {
    setInvestigationState("searching"); // entering dashboard → searching
    return () => setInvestigationState("idle"); // leaving → idle
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading || !investigation) {
    return (
      <div className="mx-auto max-w-7xl space-y-6 p-6">
        <CardSkeleton lines={2} />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </div>
    );
  }

  const combinedAudit = [...baseAudit, ...auditTrail];

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <motion.div variants={fadeUp} initial="hidden" animate="show" custom={0}>
        <InvestigationHeader investigation={investigation} />
      </motion.div>

      {investigation.status === "running" && (
        <motion.div variants={fadeUp} initial="hidden" animate="show" custom={0.5}>
          <div className="flex items-start gap-3 rounded-xl border border-accent/30 bg-accent/10 px-4 py-3 text-sm text-accent">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="flex flex-col">
              <span className="font-semibold tracking-tight">Ultron is cooking on {investigation.type.toUpperCase()} mode!</span>
              <span className="mt-0.5 opacity-90 leading-snug">
                Feel free to leave this tab. Your progress is automatically saved, and it might take a few minutes to process the full output. Live logs are streaming below.
              </span>
            </div>
          </div>
        </motion.div>
      )}

      <motion.div variants={fadeUp} initial="hidden" animate="show" custom={1}>
        <ExecutionPipeline stages={investigation.stages} />
      </motion.div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <motion.div variants={fadeUp} initial="hidden" animate="show" custom={2} className="lg:col-span-2">
          <AuditTimeline events={combinedAudit} />
        </motion.div>
        <motion.div variants={fadeUp} initial="hidden" animate="show" custom={3}>
          <LiveActivityFeed events={liveEvents} />
        </motion.div>
      </div>

      <motion.div variants={fadeUp} initial="hidden" animate="show" custom={4}>
        <TrustMetrics metrics={metrics} />
      </motion.div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <motion.div variants={fadeUp} initial="hidden" animate="show" custom={5} className="lg:col-span-2">
          <EvidencePanel evidence={evidence} />
        </motion.div>
        {contradictions[0] && (
          <motion.div variants={fadeUp} initial="hidden" animate="show" custom={6}>
            <ContradictionCard contradiction={contradictions[0]} />
          </motion.div>
        )}
      </div>

      <motion.div variants={fadeUp} initial="hidden" animate="show" custom={7}>
        <ExplainabilityPanel sections={explainability} />
      </motion.div>

      {report && (
        <motion.div variants={fadeUp} initial="hidden" animate="show" custom={8}>
          <ExecutiveSummaryCard summary={report.executiveSummary} onOpenReport={() => setReportOpen(true)} />
        </motion.div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <motion.div variants={fadeUp} initial="hidden" animate="show" custom={9}>
          <CoverageChecklist items={report?.coverage ?? []} />
        </motion.div>
        <motion.div variants={fadeUp} initial="hidden" animate="show" custom={10}>
          <LimitationsCard limitations={report?.limitations ?? []} />
        </motion.div>
      </div>

      <ReportPanel report={report} open={reportOpen} onClose={() => setReportOpen(false)} />
    </div>
  );
}
