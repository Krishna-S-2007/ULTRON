import type { CoverageItem } from "@/types/investigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { CheckSquare, Square } from "lucide-react";
import { cn } from "@/lib/utils";

export function CoverageChecklist({ items }: { items: CoverageItem[] }) {
  const completeCount = items.filter((i) => i.complete).length;

  return (
    <Card className="border-white/10 bg-gradient-to-br from-white/[0.05] to-transparent backdrop-blur-lg shadow-2xl">
      <CardHeader>
        <CardTitle>Investigation Coverage</CardTitle>
        <CardDescription>
          {completeCount} of {items.length} source categories actively corroborated in this investigation.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {items.map((item) => (
            <li
              key={item.id}
              className={cn(
                "flex items-center gap-2.5 rounded-lg border px-3 py-2 text-sm",
                item.complete
                  ? "border-signal-verified/20 bg-signal-verified/[0.04] text-ink"
                  : "border-border bg-white/[0.015] text-ink-faint"
              )}
            >
              {item.complete ? (
                <CheckSquare className="h-4 w-4 shrink-0 text-signal-verified" />
              ) : (
                <Square className="h-4 w-4 shrink-0 text-ink-faint" />
              )}
              {item.label}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
