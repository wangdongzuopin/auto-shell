import { X } from "lucide-react";
import { useUIStore } from "@/stores/ui-store";
import { DiffView } from "./diff-view";
import { PlanSidebar } from "./plan-sidebar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export function RightPanel() {
  const view = useUIStore((s) => s.rightPanelView);
  const closeRightPanel = useUIStore((s) => s.closeRightPanel);

  return (
    <div className="h-full flex flex-col bg-sidebar">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border shrink-0">
        <span className="text-[11px] font-medium text-muted-foreground">
          {view === "diff" ? "Diff" : view === "plan" ? "Plan" : "Details"}
        </span>
        <Button variant="ghost" size="icon" onClick={closeRightPanel}>
          <X size={12} />
        </Button>
      </div>
      <div className="flex-1 overflow-hidden">
        {view === "diff" && <DiffView />}
        {view === "plan" && <PlanSidebar />}
      </div>
    </div>
  );
}
