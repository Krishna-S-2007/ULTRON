import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium leading-normal",
  {
    variants: {
      variant: {
        neutral: "border-border bg-white/5 text-ink-muted",
        info: "border-signal-info/30 bg-signal-info/10 text-signal-info",
        success: "border-signal-verified/30 bg-signal-verified/10 text-signal-verified",
        warning: "border-signal-pending/30 bg-signal-pending/10 text-signal-pending",
        danger: "border-signal-rejected/30 bg-signal-rejected/10 text-signal-rejected",
        accent: "border-accent/30 bg-accent/10 text-accent",
      },
    },
    defaultVariants: { variant: "neutral" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
