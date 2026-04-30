import { useChatStore } from "@/stores/chatStore";
import { useModelStore } from "@/stores/modelStore";
import { useUIStore } from "@/stores/ui-store";

export function StatusBar() {
  const models = useModelStore((s) => s.models);
  const activeModelId = useModelStore((s) => s.activeModelId);
  const sessionStatus = useChatStore((s) => s.sessionStatus);
  const currentThreadId = useChatStore((s) => s.currentThreadId);

  const activeModel = models.find((m) => m.id === activeModelId);

  const status = currentThreadId ? sessionStatus[currentThreadId] : null;
  const statusColor =
    status === "running" ? "bg-accent" :
    status === "error" ? "bg-destructive" :
    status === "completed" ? "bg-info" :
    "bg-muted-foreground";

  return (
    <div className="h-6 shrink-0 flex items-center justify-between px-3 text-[11px] text-muted-foreground border-t border-border bg-sidebar select-none">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${statusColor}`} />
          <span>{status ? status.charAt(0).toUpperCase() + status.slice(1) : "Idle"}</span>
        </div>
        {activeModel && (
          <span>{activeModel.name}</span>
        )}
      </div>
      <div className="flex items-center gap-3">
        <button
          className="hover:text-foreground transition-colors"
          onClick={() => useUIStore.getState().toggleSidebar()}
        >
          Toggle Sidebar
        </button>
      </div>
    </div>
  );
}
