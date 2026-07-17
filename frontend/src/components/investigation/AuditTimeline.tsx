import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { AuditEvent } from "@/types/investigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

const kindDot: Record<AuditEvent["kind"], string> = {
  info: "bg-signal-info",
  success: "bg-signal-verified",
  warning: "bg-signal-pending",
  error: "bg-signal-rejected",
};

export function AuditTimeline({ events }: { events: AuditEvent[] }) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [events]);

  return (
    <Card className="border-white/10 bg-gradient-to-br from-white/[0.05] to-transparent backdrop-blur-lg">
      <CardHeader>
        <CardTitle>AI Audit Trail</CardTitle>
        <CardDescription>Every backend action, in order, as it happens.</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[280px] pr-3">
          <ol className="relative space-y-0">
            <AnimatePresence initial={false}>
              {events.map((event, idx) => (
                <motion.li
                  key={event.id}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.25 }}
                  className="relative flex gap-3 pb-5 last:pb-0"
                >
                  {idx !== events.length - 1 && (
                    <span className="absolute left-[5px] top-3 h-full w-px bg-border" />
                  )}
                  <span className={cn("relative z-10 mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full", kindDot[event.kind])} />
                  <div className="min-w-0">
                    <p className="text-sm text-ink">{event.message}</p>
                    <p className="mt-0.5 font-mono text-[10.5px] text-ink-faint">{event.timestamp}</p>
                  </div>
                </motion.li>
              ))}
            </AnimatePresence>
            <div ref={bottomRef} className="h-1" />
          </ol>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
