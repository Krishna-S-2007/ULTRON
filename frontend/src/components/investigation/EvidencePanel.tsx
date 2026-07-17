import { useState } from "react";
import { motion } from "framer-motion";
import { ExternalLink, Landmark, Newspaper, GraduationCap, Building2, MessageCircle, FileQuestion, BarChart3 } from "lucide-react";
import type { EvidenceItem, VerificationStatus } from "@/types/investigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDate } from "@/lib/utils";
import { EmptyState } from "@/components/common/EmptyState";

const sourceIcon = {
  news: Newspaper,
  government: Landmark,
  academic: GraduationCap,
  company: Building2,
  social: MessageCircle,
  blog: FileQuestion,
  court_record: Landmark,
  industry_report: BarChart3,
} as const;

const verificationVariant: Record<VerificationStatus, "success" | "warning" | "danger"> = {
  verified: "success",
  pending: "warning",
  rejected: "danger",
};

function EvidenceCard({ item }: { item: EvidenceItem }) {
  const Icon = sourceIcon[item.sourceType];
  return (
    <motion.a
      href={item.url}
      target="_blank"
      rel="noreferrer"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="group flex flex-col gap-3 rounded-lg border border-border bg-white/[0.015] p-4 transition-colors hover:border-accent/40 hover:bg-card-hover"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-white/[0.03] text-ink-muted">
            <Icon className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-ink group-hover:text-accent">{item.sourceName}</p>
            <p className="text-[11px] capitalize text-ink-faint">{item.sourceType.replace("_", " ")}</p>
          </div>
        </div>
        <ExternalLink className="h-3.5 w-3.5 shrink-0 text-ink-faint opacity-0 transition-opacity group-hover:opacity-100" />
      </div>

      {item.excerpt && <p className="line-clamp-2 text-xs leading-relaxed text-ink-muted">{item.excerpt}</p>}

      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant={verificationVariant[item.verification]} className="capitalize">
          {item.verification}
        </Badge>
        <Badge variant="neutral" className="font-mono">
          Credibility {item.credibility}%
        </Badge>
        <Badge variant="neutral" className="font-mono">
          Confidence {item.confidence}%
        </Badge>
      </div>

      <p className="text-[10.5px] text-ink-faint">{formatDate(item.publishedAt)}</p>
    </motion.a>
  );
}

export function EvidencePanel({ evidence }: { evidence: EvidenceItem[] }) {
  const [filter, setFilter] = useState<"all" | VerificationStatus>("all");
  const filtered = filter === "all" ? evidence : evidence.filter((e) => e.verification === filter);

  return (
    <Card className="border-white/10 bg-gradient-to-br from-white/[0.05] to-transparent backdrop-blur-lg">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Evidence</CardTitle>
          <CardDescription>{evidence.length} sources gathered and scored for credibility.</CardDescription>
        </div>
        <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="verified">Verified</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="rejected">Rejected</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent>
        {filtered.length === 0 ? (
          <EmptyState icon={FileQuestion} title="No sources in this category" description="Try a different filter." />
        ) : (
          <ScrollArea className="h-[400px] pr-3">
            <div className="grid grid-cols-1 gap-3 pb-2 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((item) => (
                <EvidenceCard key={item.id} item={item} />
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
