/**
 * InvestigationStateContext
 *
 * A lightweight context that broadcasts the current AI investigation phase
 * from any page/component (e.g. Dashboard) to the AnimatedRibbon background.
 *
 * BACKEND WIRING: When the real investigation stream arrives, update
 * `setInvestigationState` based on the active pipeline stage or stream event.
 * The Dashboard already does this via `useInvestigationStream` — see
 * Dashboard.tsx for where `setInvestigationState` is called.
 */

import { createContext, useContext, useState, type ReactNode } from "react";

export type InvestigationState =
  | "idle"
  | "planning"
  | "searching"
  | "verifying"
  | "reasoning"
  | "report"
  | "completed";

interface InvestigationStateContextValue {
  investigationState: InvestigationState;
  setInvestigationState: (state: InvestigationState) => void;
}

const InvestigationStateContext = createContext<InvestigationStateContextValue>({
  investigationState: "idle",
  setInvestigationState: () => {},
});

export function InvestigationStateProvider({ children }: { children: ReactNode }) {
  const [investigationState, setInvestigationState] = useState<InvestigationState>("idle");

  return (
    <InvestigationStateContext.Provider value={{ investigationState, setInvestigationState }}>
      {children}
    </InvestigationStateContext.Provider>
  );
}

/** Use inside any component to read the current investigation phase. */
export function useInvestigationState() {
  return useContext(InvestigationStateContext);
}
