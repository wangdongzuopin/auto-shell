import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { CheckCircle2, Circle, Clock, ListTodo } from "lucide-react"

interface PlanStep {
  id: string
  title: string
  description?: string
  status: "pending" | "in_progress" | "done"
}

// Plan steps would come from AI tool calls in a full implementation
const defaultSteps: PlanStep[] = []

export function PlanSidebar() {
  if (defaultSteps.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-4">
        <ListTodo className="h-8 w-8 text-text-tertiary/40 mb-2" />
        <p className="text-xs text-text-tertiary">暂无执行计划</p>
        <p className="text-[10px] text-text-tertiary/50 mt-1">
          启动 AI 任务后可在此查看执行计划
        </p>
      </div>
    )
  }

  const getStatusIcon = (status: PlanStep["status"]) => {
    switch (status) {
      case "done":
        return <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
      case "in_progress":
        return <Clock className="h-4 w-4 text-warning animate-pulse shrink-0" />
      case "pending":
        return <Circle className="h-4 w-4 text-text-tertiary/40 shrink-0" />
    }
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-3 space-y-1">
        {defaultSteps.map((step, i) => (
          <div
            key={step.id}
            className={cn(
              "flex items-start gap-2.5 p-2.5 rounded-lg transition-all",
              step.status === "in_progress" && "bg-accent-dev/5 border border-accent-dev/20"
            )}
          >
            <div className="flex flex-col items-center pt-px">
              {getStatusIcon(step.status)}
              {i < defaultSteps.length - 1 && (
                <div className="w-px h-full min-h-[20px] bg-border/30 mt-1" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p
                className={cn(
                  "text-xs font-medium",
                  step.status === "done" ? "text-text-tertiary line-through" : "text-text-primary"
                )}
              >
                {step.title}
              </p>
              {step.description && (
                <p className="text-[10px] text-text-tertiary mt-0.5 leading-relaxed">
                  {step.description}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  )
}
