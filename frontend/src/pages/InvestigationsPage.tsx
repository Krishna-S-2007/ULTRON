import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Radar, ArrowRight, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { getInvestigations } from "@/services/api";
import type { Investigation } from "@/types/investigation";

const statusVariant = { running: "info", completed: "success", failed: "danger", paused: "warning" } as const;

export default function InvestigationsPage() {
  const [history, setHistory] = useState<Investigation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getInvestigations().then((data) => {
      if (active) {
        setHistory(data);
        setLoading(false);
      }
    }).catch((err) => {
      console.error(err);
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-ink">Investigations</h1>
          <p className="mt-1 text-sm text-ink-muted">All investigations, running and completed.</p>
        </div>
        <Button asChild size="sm">
          <Link to="/">
            <Plus className="h-3.5 w-3.5" />
            New Investigation
          </Link>
        </Button>
      </div>

      <div className="space-y-3">
        {loading ? (
          <p className="text-sm text-ink-muted">Loading investigations...</p>
        ) : history.length === 0 ? (
          <p className="text-sm text-ink-muted">No investigations found. Start one to see it here.</p>
        ) : history.map((inv) => (
          <Link key={inv.id} to={`/investigations/${inv.id}`}>
            <Card className="group transition-colors hover:border-accent/40 hover:bg-card-hover">
              <CardContent className="flex items-center justify-between gap-4 p-4">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-white/[0.03] text-ink-muted">
                    <Radar className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink">{inv.objective}</p>
                    <p className="mt-0.5 font-mono text-[11px] text-ink-faint">
                      {inv.id} · {formatDate(inv.createdAt)}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <Badge variant={statusVariant[inv.status]} className="capitalize">
                    {inv.status}
                  </Badge>
                  <span className="font-mono text-xs text-ink-muted">{inv.confidence}%</span>
                  <ArrowRight className="h-3.5 w-3.5 text-ink-faint transition-transform group-hover:translate-x-0.5" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
