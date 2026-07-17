import type { Limitation } from "@/types/investigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Info } from "lucide-react";

export function LimitationsCard({ limitations }: { limitations: Limitation[] }) {
  return (
    <Card className="border-signal-pending/20 bg-signal-pending/[0.03]">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4 text-signal-pending" />
          <CardTitle>Limitations</CardTitle>
        </div>
        <CardDescription>This investigation is based only on publicly available information.</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {limitations.map((l) => (
            <li key={l.id} className="flex gap-2 text-sm text-ink-muted">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-signal-pending" />
              {l.text}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
