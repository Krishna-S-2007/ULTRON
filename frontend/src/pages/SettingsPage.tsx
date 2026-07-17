import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

const rows = [
  { label: "Default investigation type", value: "Company" },
  { label: "Minimum source credibility", value: "60%" },
  { label: "Auto re-search on knowledge gap", value: "Enabled" },
  { label: "Notify on report ready", value: "Enabled" },
];

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-ink">Settings</h1>
        <p className="mt-1 text-sm text-ink-muted">Workspace defaults for new investigations.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Investigation Defaults</CardTitle>
          <CardDescription>Applied to every new investigation you start.</CardDescription>
        </CardHeader>
        <CardContent className="divide-y divide-border">
          {rows.map((row) => (
            <div key={row.label} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
              <span className="text-sm text-ink-muted">{row.label}</span>
              <span className="text-sm font-medium text-ink">{row.value}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
