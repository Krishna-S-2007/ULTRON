import { NavLink } from "react-router-dom";
import { LayoutGrid, ShieldCheck, FileText, Radar } from "lucide-react";
import { cn } from "@/lib/utils";
import { useActiveInvestigation } from "@/context/ActiveInvestigationContext";

export function Sidebar() {
  const { activeId } = useActiveInvestigation();

  const navItems = [
    { to: "/", label: "Dashboard", icon: LayoutGrid, end: true },
    { to: "/investigations", label: "Investigations", icon: Radar },
    { to: "/reports", label: "Reports", icon: FileText },
  ];

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-base md:flex">
      <div className="flex h-16 items-center gap-2.5 px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/15 text-accent">
          <ShieldCheck className="h-[18px] w-[18px]" strokeWidth={2.25} />
        </div>
        <div className="leading-tight">
          <p className="text-sm font-semibold tracking-tight text-ink">Ultron</p>
          <p className="text-[10.5px] text-ink-faint">Investigation Workspace</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-3">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-accent-soft text-accent"
                  : "text-ink-muted hover:bg-white/[0.04] hover:text-ink"
              )
            }
          >
            <item.icon className="h-4 w-4" strokeWidth={2} />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="mx-3 mb-4 rounded-lg border border-border bg-white/[0.02] p-3">
        <p className="text-[11px] font-medium text-ink-muted">Publicly available sources only</p>
        <p className="mt-1 text-[10.5px] leading-relaxed text-ink-faint">
          Every finding is traced to a cited, verifiable source.
        </p>
      </div>
    </aside>
  );
}
