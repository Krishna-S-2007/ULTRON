import { motion } from "framer-motion";
import { Check, Loader2, X, Circle } from "lucide-react";
import type { PipelineStage } from "@/types/investigation";
import { cn } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

const statusConfig = {
  pending: { icon: Circle, ring: "border-border text-ink-faint bg-white/[0.02]", line: "bg-border" },
  running: { icon: Loader2, ring: "border-accent text-accent bg-accent-soft", line: "bg-border" },
  completed: { icon: Check, ring: "border-signal-verified text-signal-verified bg-signal-verified/10", line: "bg-signal-verified/40" },
  failed: { icon: X, ring: "border-signal-rejected text-signal-rejected bg-signal-rejected/10", line: "bg-signal-rejected/40" },
} as const;

export function ExecutionPipeline({ stages }: { stages: PipelineStage[] }) {
  return (
    <Card className="border-white/10 bg-gradient-to-br from-white/[0.05] to-transparent backdrop-blur-lg shadow-2xl">
      <CardHeader>
        <CardTitle>Execution Pipeline</CardTitle>
        <CardDescription>Autonomous agent progress through each investigation phase.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-start overflow-x-auto pb-1 scrollbar-thin">
          {stages.map((stage, idx) => {
            const cfg = statusConfig[stage.status];
            const Icon = cfg.icon;
            const isLast = idx === stages.length - 1;
            return (
              <div key={stage.id} className="flex min-w-[110px] flex-1 items-start">
                <div className="flex flex-1 flex-col items-center text-center">
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: idx * 0.06, duration: 0.3 }}
                    className={cn("flex h-9 w-9 items-center justify-center rounded-full border-2", cfg.ring)}
                  >
                    <Icon className={cn("h-4 w-4", stage.status === "running" && "animate-spin")} strokeWidth={2.5} />
                  </motion.div>
                  <p
                    className={cn(
                      "mt-2 max-w-[100px] text-[11.5px] font-medium leading-tight",
                      stage.status === "pending" ? "text-ink-faint" : "text-ink"
                    )}
                  >
                    {stage.label}
                  </p>
                  <span className="mt-0.5 text-[10px] capitalize text-ink-faint">{stage.status}</span>
                </div>
                {!isLast && (
                  <div className="mt-[18px] flex-1">
                    <div className={cn("h-0.5 w-full rounded-full", cfg.line)} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
