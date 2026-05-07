import { useAppStore } from "@/stores/appStore";
import { useProjectStore } from "@/stores/projectStore";
import { Button } from "@/components/ui/button";
import {
  Sun,
  Moon,
  PanelLeftClose,
  PanelLeft,
  Hammer,
  Minus,
  Square,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

async function minimizeWindow() {
  try {
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    await getCurrentWindow().minimize();
  } catch {}
}
async function toggleMaximizeWindow() {
  try {
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    await getCurrentWindow().toggleMaximize();
  } catch {}
}
async function closeWindow() {
  try {
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    await getCurrentWindow().close();
  } catch {}
}

export function TitleBar() {
  const { role, theme, toggleTheme, sidebarOpen, setSidebarOpen } = useAppStore();
  const { projects, conversations, currentProjectId, currentConversationId } =
    useProjectStore();

  const isDev = role === "developer";
  const currentProject = projects.find((p) => p.id === currentProjectId);
  const currentConversation = conversations.find(
    (c) => c.id === currentConversationId
  );

  return (
    <header className="relative z-50 flex h-10 items-center justify-between border-b border-border bg-glass-bg/80 select-none">
      {/* Draggable area — occupies remaining space */}
      <div
        data-tauri-drag-region
        className="flex items-center gap-1 min-w-0 pl-2 flex-1 h-full"
      >
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="h-7 w-7 text-text-tertiary hover:text-text-primary shrink-0"
        >
          {sidebarOpen ? (
            <PanelLeftClose className="h-3.5 w-3.5" />
          ) : (
            <PanelLeft className="h-3.5 w-3.5" />
          )}
        </Button>

        <Hammer
          className={cn(
            "h-3.5 w-3.5 shrink-0 ml-1",
            isDev ? "text-accent-dev" : "text-accent-pm"
          )}
        />

        {/* Breadcrumb */}
        {currentProject && currentConversation && (
          <>
            <span className="w-px h-4 bg-border mx-1" />
            <span className="text-xs text-text-tertiary truncate max-w-[120px] font-mono">
              {currentProject.name}
            </span>
            <span className="text-text-tertiary/50 text-[10px]">/</span>
            <span className="text-xs text-text-secondary truncate max-w-[140px]">
              {currentConversation.title}
            </span>
          </>
        )}
      </div>

      {/* Non-draggable controls */}
      <div className="flex items-center gap-0.5 pr-1 shrink-0">
        <span
          className={cn(
            "text-[9px] px-1.5 py-0.5 rounded font-mono font-medium tracking-wider uppercase shrink-0",
            isDev
              ? "bg-accent-dev/10 text-accent-dev"
              : "bg-accent-pm/10 text-accent-pm"
          )}
        >
          {isDev ? "Dev" : "PM"}
        </span>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          className="h-7 w-7 text-text-tertiary hover:text-text-primary shrink-0"
        >
          {theme === "dark" ? (
            <Sun className="h-3.5 w-3.5" />
          ) : (
            <Moon className="h-3.5 w-3.5" />
          )}
        </Button>

        {/* Window controls */}
        <div className="flex items-center ml-1 shrink-0">
          <button
            onClick={() => minimizeWindow()}
            className="h-7 w-8 flex items-center justify-center text-text-tertiary hover:text-text-primary hover:bg-bg-hover/40 rounded transition-colors"
          >
            <Minus className="h-3 w-3" />
          </button>
          <button
            onClick={() => toggleMaximizeWindow()}
            className="h-7 w-8 flex items-center justify-center text-text-tertiary hover:text-text-primary hover:bg-bg-hover/40 rounded transition-colors"
          >
            <Square className="h-3 w-3" />
          </button>
          <button
            onClick={() => closeWindow()}
            className="h-7 w-8 flex items-center justify-center text-text-tertiary hover:text-white hover:bg-danger rounded transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
}
