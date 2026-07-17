import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Search, Globe, Compass, RotateCcw, Radio } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/common/EmptyState";
import { cn } from "@/lib/utils";
import type { LiveEvent } from "@/types/investigation";

interface FeedRow {
  id: string;
  icon: typeof Search;
  tone: string;
  text: string;
  meta?: string;
}

function toFeedRow(event: LiveEvent, idx: number): FeedRow | null {
  switch (event.type) {
    case "planner":
      return { id: `${idx}`, icon: Compass, tone: "text-indigo", text: event.task, meta: "Planner" };
    case "search":
      return { id: `${idx}`, icon: Search, tone: "text-accent", text: event.query, meta: "Searching" };
    case "url":
      return {
        id: `${idx}`,
        icon: Globe,
        tone: event.status === "verified" ? "text-signal-verified" : event.status === "rejected" ? "text-signal-rejected" : "text-signal-pending",
        text: event.domain,
        meta: event.status,
      };
    case "browser":
      return { id: `${idx}`, icon: Globe, tone: "text-signal-info", text: new URL(event.url).hostname, meta: "Opening" };
    case "gap":
      return { id: `${idx}`, icon: RotateCcw, tone: "text-signal-pending", text: event.message, meta: "Loop" };
    default:
      return null;
  }
}

export function LiveActivityFeed({ events }: { events: LiveEvent[] }) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const rows = events.map(toFeedRow).filter((r): r is FeedRow => r !== null);
  const latestGap = [...events].reverse().find((e) => e.type === "gap");

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [rows.length]);

  return (
    <Card className="border-accent/20 bg-gradient-to-br from-accent/[0.08] to-transparent backdrop-blur-lg">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Radio className="h-3.5 w-3.5 text-accent" />
            Live Activity
          </CardTitle>
          <CardDescription>Search queries, source checks, and browsing as they happen.</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        {latestGap && (
          <div className="mb-3 flex items-center gap-2 rounded-lg border border-signal-pending/25 bg-signal-pending/[0.06] px-3 py-2 text-xs text-signal-pending">
            <RotateCcw className="h-3.5 w-3.5 animate-spin" style={{ animationDuration: "2.5s" }} />
            Knowledge gap found — searching again…
          </div>
        )}
        {rows.length === 0 ? (
          <EmptyState icon={Radio} title="Waiting for activity" description="Live agent actions will appear here once the investigation starts." />
        ) : (
          <ScrollArea className="h-[220px] pr-3">
            <ul className="space-y-1.5">
              <AnimatePresence initial={false}>
                {rows.map((row) => (
                  <motion.li
                    key={row.id}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm hover:bg-white/[0.02]"
                  >
                    <row.icon className={cn("h-3.5 w-3.5 shrink-0", row.tone)} />
                    <span className="truncate text-ink-muted">{row.text}</span>
                    {row.meta && (
                      <Badge variant="neutral" className="ml-auto shrink-0 capitalize">
                        {row.meta}
                      </Badge>
                    )}
                  </motion.li>
                ))}
              </AnimatePresence>
              <div ref={bottomRef} className="h-1" />
            </ul>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
