import type { ExecutiveSummary as ExecutiveSummaryType } from "@/types/investigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, FileDown, Share2, CheckCircle2, ArrowUpRight } from "lucide-react";

const riskVariant = { low: "success", medium: "warning", high: "danger" } as const;

interface Props {
  summary: ExecutiveSummaryType;
  onOpenReport?: () => void;
}

export function ExecutiveSummaryCard({ summary, onOpenReport }: Props) {
  return (
    <Card className="border-accent/20 bg-gradient-to-b from-accent/[0.04] to-card">
      <CardHeader className="flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle className="text-base">Final Assessment</CardTitle>
          <CardDescription>Executive summary of the completed investigation.</CardDescription>
        </div>
        <Badge variant={riskVariant[summary.riskLevel]} className="capitalize">
          {summary.riskLevel} risk
        </Badge>
      </CardHeader>
      <CardContent className="space-y-5">
        <p className="text-sm leading-relaxed text-ink-muted">{summary.summary}</p>

        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-ink-faint">Key Findings</p>
          <ul className="mt-2 space-y-1.5">
            {summary.keyFindings.map((f, i) => (
              <li key={i} className="flex gap-2 text-sm text-ink">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-signal-verified" />
                {f}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-ink-faint">Recommended Next Actions</p>
          <ul className="mt-2 space-y-1.5">
            {summary.recommendedActions.map((a, i) => (
              <li key={i} className="flex gap-2 text-sm text-ink-muted">
                <ArrowUpRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
                {a}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          <Button size="sm" onClick={onOpenReport}>
            <FileDown className="h-3.5 w-3.5" />
            Download Report
          </Button>
          <Button size="sm" variant="secondary">
            <Download className="h-3.5 w-3.5" />
            Export PDF
          </Button>
          <Button size="sm" variant="ghost">
            <Share2 className="h-3.5 w-3.5" />
            Share
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
