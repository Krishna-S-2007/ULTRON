import { Routes, Route, useLocation, useParams } from "react-router-dom";
import { Sidebar } from "@/components/layout/Sidebar";
import { Navbar } from "@/components/layout/Navbar";
import Home from "@/pages/Home";
import Dashboard from "@/pages/Dashboard";
import InvestigationsPage from "@/pages/InvestigationsPage";
import ReportsPage from "@/pages/ReportsPage";
import { AnimatedRibbon } from "@/components/background/AnimatedRibbon";
import {
  InvestigationStateProvider,
  useInvestigationState,
} from "@/context/InvestigationStateContext";
import { ActiveInvestigationProvider } from "@/context/ActiveInvestigationContext";

function DashboardNavbar() {
  const { id } = useParams();
  return <Navbar investigationLabel={id} />;
}

function LayoutNavbar() {
  const location = useLocation();
  if (location.pathname.startsWith("/investigations/")) {
    return <DashboardNavbar />;
  }
  return <Navbar />;
}

/**
 * AppShell — reads the shared investigation state from context and feeds it
 * to AnimatedRibbon. Kept as a child of InvestigationStateProvider so it can
 * access the context value.
 *
 * BACKEND WIRING:
 * investigationState is set by Dashboard.tsx via setInvestigationState()
 * whenever the live event stream reports a new pipeline stage. No changes
 * are needed here when connecting to a real backend.
 */
function AppShell() {
  const { investigationState } = useInvestigationState();

  return (
    // Relative container so fixed ribbon and absolute UI layers stack correctly
    <div className="relative h-screen overflow-hidden">
      {/* ── Animated ribbon background (z-index 0, pointer-events none) ────── */}
      <AnimatedRibbon state={investigationState} />

      {/* ── Application UI (z-index 1, fully interactive) ─────────────────── */}
      {/* UI layer sits above the ribbon; individual components own their backgrounds */}
      <div
        className="relative flex h-screen"
        style={{ zIndex: 1 }}
      >
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col overflow-y-auto scrollbar-thin">
          <LayoutNavbar />
          <main className="flex-1">
            <Routes>
              <Route path="/"                    element={<Home />} />
              <Route path="/investigations"      element={<InvestigationsPage />} />
              <Route path="/investigations/:id"  element={<Dashboard />} />
              <Route path="/reports"             element={<ReportsPage />} />
            </Routes>
          </main>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <InvestigationStateProvider>
      <ActiveInvestigationProvider>
        <AppShell />
      </ActiveInvestigationProvider>
    </InvestigationStateProvider>
  );
}
