import { useState, useEffect } from "react";
import { FileText, Download } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ReportPanel } from "@/components/investigation/ReportPanel";
import { formatDate } from "@/lib/utils";
import { getInvestigations, getReport } from "@/services/api";
import type { Investigation, InvestigationReport } from "@/types/investigation";

export default function ReportsPage() {
  const [completed, setCompleted] = useState<Investigation[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [activeReport, setActiveReport] = useState<InvestigationReport | null>(null);

  useEffect(() => {
    let active = true;
    getInvestigations().then((data) => {
      if (active) {
        setCompleted(data.filter(inv => inv.status === "completed"));
        setLoading(false);
      }
    }).catch(err => {
      console.error(err);
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!openId) {
      setActiveReport(null);
      return;
    }
    getReport(openId).then(setActiveReport).catch(console.error);
  }, [openId]);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-ink">Reports</h1>
        <p className="mt-1 text-sm text-ink-muted">Generated executive reports across all investigations.</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {loading ? (
          <p className="text-sm text-ink-muted">Loading reports...</p>
        ) : completed.length === 0 ? (
          <p className="text-sm text-ink-muted">No completed reports available yet.</p>
        ) : completed.map((r) => (
          <Card key={r.id} className="transition-colors hover:border-accent/40">
            <CardContent className="flex items-start gap-3 p-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-white/[0.03] text-accent">
                <FileText className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">{r.objective}</p>
                <p className="mt-0.5 font-mono text-[11px] text-ink-faint">
                  {r.id} · {formatDate(r.createdAt)}
                </p>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => setOpenId(r.id)}>
                    Open
                  </Button>
                  <Button size="sm" variant="ghost">
                    <Download className="h-3.5 w-3.5" />
                    Markdown
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <ReportPanel report={activeReport} open={!!openId} onClose={() => setOpenId(null)} />
    </div>
  );
}
