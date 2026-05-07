import { useCallback, useEffect } from "react"
import { useUIStore } from "@/stores/uiStore"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { DiffView } from "@/components/layout/DiffView"
import { PlanSidebar } from "@/components/layout/PlanSidebar"
import { ArtifactsSidebar } from "@/components/artifacts/ArtifactsSidebar"
import { cn } from "@/lib/utils"
import { X, PanelLeftClose } from "lucide-react"

export function RightPanel() {
  const { rightPanelOpen, rightPanelView, setRightPanelOpen, setRightPanelView, toggleRightPanel } = useUIStore()

  // Ctrl+Shift+P toggle
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === "P") {
        e.preventDefault()
        toggleRightPanel()
      }
    },
    [toggleRightPanel]
  )

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [handleKeyDown])

  return (
    <div
      className={cn(
        "relative border-l border-border/50 bg-glass-bg-strong backdrop-blur-xl transition-all duration-300 ease-out overflow-hidden flex flex-col",
        rightPanelOpen ? "w-72" : "w-0 border-l-0"
      )}
    >
      {rightPanelOpen && (
        <>
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-border/30">
            <Tabs
              value={rightPanelView}
              onValueChange={(v) => setRightPanelView(v as "diff" | "plan" | "artifacts")}
            >
              <TabsList>
                <TabsTrigger value="diff">差异</TabsTrigger>
                <TabsTrigger value="plan">计划</TabsTrigger>
                <TabsTrigger value="artifacts">产物</TabsTrigger>
              </TabsList>
            </Tabs>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-text-tertiary hover:text-text-primary"
              onClick={() => setRightPanelOpen(false)}
            >
              <PanelLeftClose className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden">
            {rightPanelView === "diff" ? <DiffView /> : rightPanelView === "plan" ? <PlanSidebar /> : <ArtifactsSidebar />}
          </div>
        </>
      )}
    </div>
  )
}
