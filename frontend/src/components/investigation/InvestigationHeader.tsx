import { motion } from "framer-motion";
import type { Investigation } from "@/types/investigation";
import { Badge } from "@/components/ui/badge";
import { ConfidenceRing } from "@/components/common/ConfidenceRing";
import { formatDate, formatTime } from "@/lib/utils";
import { Building2, User, CalendarClock, Newspaper, Zap, BrainCircuit, Diamond, Sparkles } from "lucide-react";

const typeIcon: Record<string, any> = { 
  company: Building2, 
  person: User, 
  event: CalendarClock, 
  topic: Newspaper,
  flash: Zap,
  medium: BrainCircuit,
  ultra: Diamond
};

const statusStyles: Record<Investigation["status"], "info" | "success" | "danger" | "warning"> = {
  running: "info",
  completed: "success",
  failed: "danger",
  paused: "warning",
};

export function InvestigationHeader({ investigation }: { investigation: Investigation }) {
  const TypeIcon = typeIcon[investigation.type] || Sparkles;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="flex flex-col justify-between gap-6 rounded-xl border border-white/10 bg-gradient-to-br from-white/[0.05] to-transparent backdrop-blur-lg p-6 shadow-2xl md:flex-row md:items-center"
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2.5">
          <Badge variant={statusStyles[investigation.status]} className="capitalize">
            <span className="relative flex h-1.5 w-1.5">
              {investigation.status === "running" && (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-signal-info opacity-75" />
              )}
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-current" />
            </span>
            {investigation.status}
          </Badge>
          <Badge variant="neutral" className="font-mono">
            {investigation.id}
          </Badge>
          <Badge variant="neutral">
            <TypeIcon className="h-3 w-3" />
            <span className="capitalize">{investigation.type}</span>
          </Badge>
        </div>

        <h1 className="mt-3 text-balance text-xl font-semibold leading-snug tracking-tight text-ink md:text-2xl">
          {investigation.objective}
        </h1>

        <p className="mt-2 text-xs text-ink-faint">
          Created {formatDate(investigation.createdAt)} at {formatTime(investigation.createdAt)}
        </p>
      </div>

      <div className="flex shrink-0 items-center justify-center pr-2 md:pr-6">
        <ConfidenceRing value={investigation.confidence} label="Confidence" size={110} strokeWidth={7} />
      </div>
    </motion.div>
  );
}
