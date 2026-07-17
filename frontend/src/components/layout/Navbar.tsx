import { Badge } from "@/components/ui/badge";

interface NavbarProps {
  investigationLabel?: string;
}

export function Navbar({ investigationLabel }: NavbarProps) {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-base/80 px-6 backdrop-blur">
      <div className="flex items-center gap-3">
        {investigationLabel ? (
          <>
            <span className="text-xs text-ink-faint">Current investigation</span>
            <span className="text-sm font-medium text-ink">{investigationLabel}</span>
            <Badge variant="info">Live</Badge>
          </>
        ) : (
          <span className="text-sm font-medium text-ink">Overview</span>
        )}
      </div>
    </header>
  );
}
