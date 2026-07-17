import type { ExplainabilitySection } from "@/types/investigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { ListChecks, Lightbulb, Shuffle, AlertTriangle } from "lucide-react";

function SubSection({
  icon: Icon,
  title,
  items,
}: {
  icon: typeof ListChecks;
  title: string;
  items: string[];
}) {
  return (
    <div>
      <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-ink-faint">
        <Icon className="h-3.5 w-3.5" />
        {title}
      </p>
      <ul className="mt-2 space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2 text-sm text-ink-muted">
            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-ink-faint" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ExplainabilityPanel({ sections }: { sections: ExplainabilitySection[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Explainability</CardTitle>
        <CardDescription>Why the AI concluded what it did — in full.</CardDescription>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible defaultValue={sections[0]?.id}>
          {sections.map((section) => (
            <AccordionItem key={section.id} value={section.id}>
              <AccordionTrigger>
                <span className="flex items-center gap-2 text-left">
                  {section.question}
                  <Badge variant="accent" className="font-mono">
                    {section.confidence}%
                  </Badge>
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <SubSection icon={ListChecks} title="Evidence Used" items={section.evidenceUsed} />
                  <SubSection icon={Lightbulb} title="Reasoning Steps" items={section.reasoningSteps} />
                  <SubSection icon={Shuffle} title="Alternative Possibilities" items={section.alternativePossibilities} />
                  <SubSection icon={AlertTriangle} title="Limitations" items={section.limitations} />
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
}
