import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";

interface PlanStep {
  id: string;
  title: string;
  description?: string;
  status: "pending" | "in_progress" | "completed";
}

interface PlanSidebarProps {
  steps?: PlanStep[];
}

export function PlanSidebar({ steps }: PlanSidebarProps) {
  if (!steps || steps.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
        <p>No plan steps yet. Ask the agent to create a plan.</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto">
      <Accordion type="single" collapsible className="p-2">
        {steps.map((step) => (
          <AccordionItem key={step.id} value={step.id} className="border-b border-border">
            <AccordionTrigger className="text-xs py-2 hover:no-underline">
              <span className="flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full ${
                    step.status === "completed" ? "bg-accent" :
                    step.status === "in_progress" ? "bg-warning" :
                    "bg-muted-foreground"
                  }`}
                />
                <span className={step.status === "completed" ? "line-through text-muted-foreground" : ""}>
                  {step.title}
                </span>
              </span>
            </AccordionTrigger>
            {step.description && (
              <AccordionContent className="text-[11px] text-muted-foreground pb-2">
                {step.description}
              </AccordionContent>
            )}
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
