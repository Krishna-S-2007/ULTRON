import { AnimatePresence, motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { X, Download, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { InvestigationReport } from "@/types/investigation";

interface ReportPanelProps {
  report: InvestigationReport | null;
  open: boolean;
  onClose: () => void;
}

export function ReportPanel({ report, open, onClose }: ReportPanelProps) {
  return (
    <AnimatePresence>
      {open && report && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 300 }}
            className="fixed right-0 top-0 z-50 flex h-full w-full max-w-xl flex-col border-l border-border bg-base shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <p className="text-sm font-semibold text-ink">Investigation Report</p>
                <p className="font-mono text-[11px] text-ink-faint">{report.investigationId}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="secondary">
                  <FileDown className="h-3.5 w-3.5" />
                  Download
                </Button>
                <Button size="icon" variant="ghost" onClick={onClose} aria-label="Close report">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-thin px-6 py-6">
              <article className="prose-report">
                <ReactMarkdown
                  components={{
                    h1: (p) => <h1 className="mb-4 text-xl font-semibold tracking-tight text-ink" {...p} />,
                    h2: (p) => <h2 className="mb-3 mt-7 text-base font-semibold text-ink" {...p} />,
                    h3: (p) => <h3 className="mb-2 mt-5 text-sm font-semibold text-ink" {...p} />,
                    p: (p) => <p className="mb-3 text-sm leading-relaxed text-ink-muted" {...p} />,
                    ul: (p) => <ul className="mb-4 ml-1 list-none space-y-1.5" {...p} />,
                    li: (p) => <li className="flex gap-2 text-sm text-ink-muted before:mt-1.5 before:h-1 before:w-1 before:shrink-0 before:rounded-full before:bg-ink-faint" {...p} />,
                    strong: (p) => <strong className="font-semibold text-ink" {...p} />,
                    code: (p) => <code className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-[12px] text-accent" {...p} />,
                  }}
                >
                  {report.markdown}
                </ReactMarkdown>
              </article>
            </div>

            <div className="flex items-center justify-between border-t border-border px-6 py-4">
              <p className="text-[11px] text-ink-faint">
                Generated {new Date(report.generatedAt).toLocaleString()}
              </p>
              <Button size="sm" variant="secondary">
                <Download className="h-3.5 w-3.5" />
                Markdown
              </Button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
