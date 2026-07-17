import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Zap, BrainCircuit, Diamond, ChevronDown, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exampleObjectives } from "@/data/mockData";
import { startInvestigation } from "@/services/api";
import type { InvestigationType } from "@/types/investigation";
import { cn } from "@/lib/utils";

const types: { value: InvestigationType; label: string; icon: typeof Zap; desc: string }[] = [
  { value: "flash", label: "Flash", icon: Zap, desc: "Fastest execution. 1 iteration loop." },
  { value: "medium", label: "Medium", icon: BrainCircuit, desc: "Balanced depth. Takes ~7 mins." },
  { value: "ultra", label: "Ultra", icon: Diamond, desc: "Maximum depth. Takes ~12 mins." },
];

export default function Home() {
  const navigate = useNavigate();
  const [objective, setObjective] = useState("");
  const [type, setType] = useState<InvestigationType>("flash");
  const [typeOpen, setTypeOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const SelectedIcon = types.find((t) => t.value === type)!.icon;

  async function handleStart() {
    if (!objective.trim() || loading) return;
    setLoading(true);
    const { investigationId } = await startInvestigation(objective, type);
    navigate(`/investigations/${investigationId}`, { state: { objective, type } });
  }

  return (
    <div className="relative flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center overflow-hidden px-6 py-16">
      {/* Ambient background handled by AnimatedRibbon canvas — no overlay needed */}

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative z-10 mb-8 flex items-center gap-2 rounded-full border border-border bg-white/[0.03] px-3.5 py-1.5 text-xs text-ink-muted"
      >
        <Sparkles className="h-3.5 w-3.5 text-accent" />
        Autonomous AI Investigation Workspace
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.05 }}
        className="relative z-10 max-w-2xl text-balance text-center text-3xl font-semibold tracking-tight text-ink md:text-4xl"
      >
        What do you want Ultron to investigate?
      </motion.h1>
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.1 }}
        className="relative z-10 mt-3 max-w-md text-center text-sm text-ink-muted"
      >
        Set an objective. Ultron plans, searches, verifies, and reports back with every source cited.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.15 }}
        className="relative z-10 mt-10 w-full max-w-2xl rounded-2xl border border-border bg-card/90 p-2 shadow-card backdrop-blur"
      >
        <textarea
          value={objective}
          onChange={(e) => setObjective(e.target.value)}
          placeholder="Investigate Tesla ESG risks…"
          rows={3}
          className="w-full resize-none rounded-xl bg-transparent px-4 py-3.5 text-[15px] text-ink placeholder:text-ink-faint focus:outline-none"
        />
        <div className="flex items-center justify-between gap-2 px-2 pb-2 pt-1">
          <div className="relative">
            <button
              onClick={() => setTypeOpen((o) => !o)}
              className="flex items-center gap-2 rounded-lg border border-border bg-white/[0.02] px-3 py-1.5 text-xs font-medium text-ink-muted transition-colors hover:text-ink"
            >
              <SelectedIcon className="h-3.5 w-3.5" />
              {types.find((t) => t.value === type)!.label}
              <ChevronDown className={cn("h-3 w-3 transition-transform", typeOpen && "rotate-180")} />
            </button>
            {typeOpen && (
              <div className="absolute bottom-full left-0 z-10 mb-2 w-56 overflow-hidden rounded-lg border border-border bg-card shadow-card">
                {types.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => {
                      setType(t.value);
                      setTypeOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-start gap-2.5 px-3 py-2.5 text-left text-xs text-ink-muted hover:bg-white/[0.04] hover:text-ink",
                      type === t.value && "text-accent"
                    )}
                  >
                    <t.icon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium text-ink">{t.label}</span>
                      <span className="text-[10.5px] leading-tight text-ink-faint">{t.desc}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <Button onClick={handleStart} disabled={!objective.trim() || loading}>
            {loading ? "Starting…" : "Start Investigation"}
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.45, delay: 0.25 }}
        className="relative z-10 mt-6 flex flex-wrap items-center justify-center gap-2"
      >
        {exampleObjectives.map((example) => (
          <button
            key={example}
            onClick={() => setObjective(example)}
            className="rounded-full border border-border bg-white/[0.02] px-3 py-1.5 text-xs text-ink-muted transition-colors hover:border-accent/40 hover:text-ink"
          >
            {example}
          </button>
        ))}
      </motion.div>
    </div>
  );
}
