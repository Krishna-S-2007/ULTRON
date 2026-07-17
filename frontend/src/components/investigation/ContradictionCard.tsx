import { ArrowRight, GitCompareArrows } from "lucide-react";
import type { Contradiction } from "@/types/investigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function ContradictionCard({ contradiction }: { contradiction: Contradiction }) {
  return (
    <Card className="border-signal-rejected/20 bg-gradient-to-br from-signal-rejected/[0.05] to-transparent backdrop-blur-lg shadow-2xl">
      <CardHeader>
        <div className="flex items-center gap-2">
          <GitCompareArrows className="h-4 w-4 text-signal-pending" />
          <CardTitle>Contradiction Resolved</CardTitle>
        </div>
        <CardDescription>Conflicting claims found across sources, reconciled with evidence.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-signal-pending/20 bg-signal-pending/[0.04] p-4">
            <Badge variant="warning">Claim A</Badge>
            <p className="mt-2 text-sm text-ink">{contradiction.claimA.text}</p>
            <p className="mt-2 text-[11px] text-ink-faint">Source: {contradiction.claimA.source}</p>
          </div>
          <div className="rounded-lg border border-signal-pending/20 bg-signal-pending/[0.04] p-4">
            <Badge variant="warning">Claim B</Badge>
            <p className="mt-2 text-sm text-ink">{contradiction.claimB.text}</p>
            <p className="mt-2 text-[11px] text-ink-faint">Source: {contradiction.claimB.source}</p>
          </div>
        </div>

        <div className="mt-4 flex items-start gap-3 rounded-lg border border-signal-verified/25 bg-signal-verified/[0.05] p-4">
          <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-signal-verified" />
          <div>
            <p className="text-xs font-medium text-signal-verified">Resolution</p>
            <p className="mt-1 text-sm text-ink">{contradiction.resolution}</p>
            <p className="mt-2 font-mono text-[11px] text-ink-faint">
              Confidence updated to {contradiction.updatedConfidence}%
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
