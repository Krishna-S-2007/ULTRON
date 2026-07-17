import type { TrustMetric } from "@/types/investigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { ConfidenceRing } from "@/components/common/ConfidenceRing";

export function TrustMetrics({ metrics }: { metrics: TrustMetric[] }) {
  return (
    <Card className="border-white/10 bg-gradient-to-br from-white/[0.05] to-transparent backdrop-blur-lg shadow-2xl">
      <CardHeader>
        <CardTitle>Trust Metrics</CardTitle>
        <CardDescription>How the investigation's confidence is composed.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-5">
          {metrics.map((m) => (
            <div key={m.id} className="flex flex-col items-center gap-3 text-center">
              <ConfidenceRing value={m.value} size={80} strokeWidth={6} showPulse={false} />
              <div>
                <p className="text-xs font-medium leading-tight text-ink">{m.label}</p>
                <p className="mt-1 text-[10.5px] leading-snug text-ink-faint">{m.description}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
