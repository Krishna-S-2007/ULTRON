import { cn } from "@/lib/utils";

interface ConfidenceRingProps {
  value: number; // 0-100
  size?: number;
  strokeWidth?: number;
  label?: string;
  sublabel?: string;
  showPulse?: boolean;
  className?: string;
}

/**
 * The product's signature visual: a precision measurement ring rather than
 * a generic progress bar. A soft outer pulse only appears above ~70%
 * confidence, standing in for "signal lock" — the moment the investigation
 * has converged on a trustworthy answer.
 */
export function ConfidenceRing({
  value,
  size = 128,
  strokeWidth = 8,
  label,
  sublabel,
  showPulse = true,
  className,
}: ConfidenceRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(Math.max(value, 0), 100) / 100) * circumference;

  const tone =
    value >= 80 ? "#22C55E" : value >= 55 ? "#3B82F6" : value >= 35 ? "#F59E0B" : "#EF4444";

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)} style={{ width: size, height: size }}>
      {showPulse && value >= 70 && (
        <span
          className="absolute inset-0 rounded-full animate-pulse-ring"
          style={{ boxShadow: `0 0 0 2px ${tone}55` }}
        />
      )}
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={tone}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 900ms cubic-bezier(0.4,0,0.2,1), stroke 500ms" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-2xl font-semibold text-ink tabular-nums">{Math.round(value)}%</span>
        {label && <span className="mt-0.5 text-[11px] uppercase tracking-wide text-ink-faint">{label}</span>}
      </div>
      {sublabel && (
        <span className="absolute -bottom-6 text-[11px] text-ink-muted whitespace-nowrap">{sublabel}</span>
      )}
    </div>
  );
}
