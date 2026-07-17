import { useEffect, useRef, useState } from "react";
import type { Investigation, AuditEvent, LiveEvent } from "@/types/investigation";
import { streamInvestigation } from "@/services/api";

let auditIdCounter = 0;

interface UseInvestigationStreamResult {
  investigation: Investigation | null;
  liveEvents: LiveEvent[];
  auditTrail: AuditEvent[];
  reportReady: boolean;
}

/**
 * Subscribes to the live event stream for an investigation and folds
 * incoming events into local state. BACKEND: no changes needed here once
 * services/streamInvestigation is wired to a real SSE/WebSocket source —
 * this hook only depends on the LiveEvent contract.
 */
export function useInvestigationStream(
  seed: Investigation | null
): UseInvestigationStreamResult {
  const [investigation, setInvestigation] = useState<Investigation | null>(seed);
  const [liveEvents, setLiveEvents] = useState<LiveEvent[]>([]);
  const [auditTrail, setAuditTrail] = useState<AuditEvent[]>([]);
  const [reportReady, setReportReady] = useState(false);

  useEffect(() => {
    if (!seed) {
      setInvestigation(null);
      setLiveEvents([]);
      setAuditTrail([]);
      setReportReady(false);
      return;
    }
    
    setInvestigation(seed);
    setLiveEvents([]);
    setAuditTrail([]);
    setReportReady(false);

    const stop = streamInvestigation(seed.id, (event) => {
      setLiveEvents((prev) => [...prev, event]);

      if (event.type === "stage") {
        setInvestigation((prev) =>
          prev
            ? {
                ...prev,
                stages: prev.stages.map((s) => (s.id === event.stageId ? { ...s, status: event.status } : s)),
              }
            : prev
        );
      }

      if (event.type === "confidence") {
        setInvestigation((prev) => (prev ? { ...prev, confidence: event.value } : prev));
      }

      if (event.type === "timeline") {
        auditIdCounter += 1;
        setAuditTrail((prev) => [
          ...prev,
          {
            id: `live-${auditIdCounter}`,
            timestamp: new Date(event.timestamp).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }),
            message: event.message,
            kind: event.kind,
          },
        ]);
      }

      if (event.type === "report") {
        setReportReady(true);
        setInvestigation((prev) => (prev ? { ...prev, status: "completed" } : prev));
      }
    });

    return stop;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed?.id]);

  return { investigation, liveEvents, auditTrail, reportReady };
}
