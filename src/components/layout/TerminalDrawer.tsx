import { useCallback, useEffect } from "react"
import { useUIStore } from "@/stores/uiStore"
import { useTerminalStore } from "@/stores/terminalStore"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { X, Plus, Terminal, ChevronUp } from "lucide-react"

export function TerminalDrawer() {
  const { terminalOpen, toggleTerminal, setTerminalOpen } = useUIStore()
  const { tabs, activeTabId, addTab, removeTab, setActiveTab } = useTerminalStore()

  // Ctrl+` toggle
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "`") {
        e.preventDefault()
        toggleTerminal()
      }
    },
    [toggleTerminal]
  )

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [handleKeyDown])

  // Auto-create first tab
  useEffect(() => {
    if (terminalOpen && tabs.length === 0) {
      addTab()
    }
  }, [terminalOpen, tabs.length, addTab])

  return (
    <div
      className={cn(
        "relative border-t border-border/50 bg-glass-bg-strong backdrop-blur-xl transition-all duration-300 ease-out overflow-hidden",
        terminalOpen ? "h-48" : "h-0 border-t-0"
      )}
    >
      {/* Tab bar */}
      <div className="flex items-center justify-between px-3 py-1 border-b border-border/30">
        <div className="flex items-center gap-0.5">
          {tabs.map((tab) => (
            <div
              key={tab.id}
              className={cn(
                "group flex items-center gap-1.5 px-2.5 py-1 rounded-t-md text-[11px] font-medium cursor-pointer transition-colors",
                activeTabId === tab.id
                  ? "bg-bg-elevated/60 text-text-primary border-b border-accent-dev/40"
                  : "text-text-tertiary hover:text-text-secondary"
              )}
              onClick={() => setActiveTab(tab.id)}
            >
              <Terminal className="h-3 w-3" />
              <span>{tab.title}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  removeTab(tab.id)
                }}
                className="p-0.5 rounded opacity-0 group-hover:opacity-100 text-text-tertiary hover:text-danger transition-all"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </div>
          ))}
          <button
            onClick={() => addTab()}
            className="p-1 rounded text-text-tertiary hover:text-text-primary hover:bg-bg-hover/40 transition-colors"
          >
            <Plus className="h-3 w-3" />
          </button>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-text-tertiary hover:text-text-primary"
          onClick={() => setTerminalOpen(false)}
        >
          <ChevronUp className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Terminal content */}
      <div className="flex-1 p-3">
        {activeTabId && (
          <div className="flex items-center gap-2 text-xs text-text-tertiary font-mono">
            <span className="text-accent-dev">{">"}</span>
            <span className="text-text-secondary">终端就绪</span>
            <span className="text-text-tertiary/50">
              — {tabs.find((t) => t.id === activeTabId)?.cwd || "~"}
            </span>
          </div>
        )}
        {!activeTabId && tabs.length === 0 && (
          <p className="text-xs text-text-tertiary text-center mt-4">
            点击 <Plus className="h-3 w-3 inline" /> 新建终端标签页
          </p>
        )}
      </div>
    </div>
  )
}
