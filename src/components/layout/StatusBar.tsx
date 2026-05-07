import { useAppStore } from "@/stores/appStore";
import { useProjectStore } from "@/stores/projectStore";
import { cn } from "@/lib/utils";

export function StatusBar() {
  const { role, theme } = useAppStore();
  const { currentProjectId, projects } = useProjectStore();
  const currentProject = projects.find((p) => p.id === currentProjectId);

  const isDev = role === "developer";

  return (
    <footer
      className={cn(
        "relative z-40 flex h-6 items-center justify-between px-3 border-t border-border text-[11px]",
        "bg-glass-bg-strong text-text-tertiary"
      )}
    >
      <div className="flex items-center gap-2.5">
        <span
          className={cn(
            "font-mono font-medium tracking-wider",
            isDev ? "text-accent-dev" : "text-accent-pm"
          )}
        >
          {isDev ? "DEV" : "PM"}
        </span>
        <span className="w-px h-3 bg-border" />
        <span className="truncate max-w-32">
          {currentProject ? currentProject.name : "无项目"}
        </span>
      </div>
      <div className="flex items-center gap-2.5">
        <span>{theme === "dark" ? "深色" : "浅色"}</span>
        <span className="w-px h-3 bg-border" />
        <span className="font-mono">v0.1.0</span>
      </div>
    </footer>
  );
}
