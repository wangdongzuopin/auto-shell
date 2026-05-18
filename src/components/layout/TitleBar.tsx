import { useEffect, useState } from "react";
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

type Platform = "windows" | "macos" | "linux";

function detectPlatform(): Platform {
  const p = navigator.platform ?? "";
  if (/mac/i.test(p)) return "macos";
  if (/win/i.test(p)) return "windows";
  return "linux";
}

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

function MacOSTrafficLights() {
  return (
    <div className="flex items-center gap-2 shrink-0 ml-2">
      <button
        onClick={() => closeWindow()}
        className="group flex h-3 w-3 items-center justify-center rounded-full bg-[#ED6A5E] transition-colors hover:bg-[#C05046]"
      >
        <X className="hidden h-2 w-2 text-[#4A0000] group-hover:block" strokeWidth={3} />
      </button>
      <button
        onClick={() => minimizeWindow()}
        className="group flex h-3 w-3 items-center justify-center rounded-full bg-[#F5BF4F] transition-colors hover:bg-[#D4A030]"
      >
        <Minus className="hidden h-2 w-2 text-[#6B4200] group-hover:block" strokeWidth={3} />
      </button>
      <button
        onClick={() => toggleMaximizeWindow()}
        className="group flex h-3 w-3 items-center justify-center rounded-full bg-[#62C554] transition-colors hover:bg-[#4DA03D]"
      >
        <svg
          className="hidden h-[6px] w-[6px] text-[#004D00] group-hover:block"
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          strokeWidth={3}
        >
          <path d="M3 6h6M6 3v6" />
        </svg>
      </button>
    </div>
  );
}

function WindowsWindowControls() {
  return (
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
  );
}

export function TitleBar() {
  const [platform, setPlatform] = useState<Platform>("windows");
  const { role, theme, toggleTheme, sidebarOpen, setSidebarOpen } = useAppStore();
  const { projects, conversations, currentProjectId, currentConversationId } =
    useProjectStore();

  const isDev = role === "developer";
  const isMac = platform === "macos";
  const currentProject = projects.find((p) => p.id === currentProjectId);
  const currentConversation = conversations.find(
    (c) => c.id === currentConversationId
  );

  useEffect(() => {
    setPlatform(detectPlatform());
  }, []);

  return (
    <header className="relative z-50 flex h-10 items-center justify-between border-b border-border bg-glass-bg/80 select-none">
      {/* Left side */}
      <div className="flex items-center gap-1 min-w-0 h-full">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="h-7 w-7 text-text-tertiary hover:text-text-primary shrink-0 ml-1"
        >
          {sidebarOpen ? (
            <PanelLeftClose className="h-3.5 w-3.5" />
          ) : (
            <PanelLeft className="h-3.5 w-3.5" />
          )}
        </Button>
        {isMac && <MacOSTrafficLights />}
      </div>

      {/* Center — draggable title area */}
      <div
        data-tauri-drag-region
        className="flex items-center justify-center gap-1 min-w-0 flex-1 h-full"
      >
        <Hammer
          className={cn(
            "h-3.5 w-3.5 shrink-0",
            isDev ? "text-accent-dev" : "text-accent-pm"
          )}
        />

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

      {/* Right side */}
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

        {isMac ? (
          /* macOS: no window controls on right, just a spacer to balance the left traffic lights */
          <div className="w-[68px]" />
        ) : (
          <WindowsWindowControls />
        )}
      </div>
    </header>
  );
}
