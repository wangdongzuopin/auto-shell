import { useUIStore } from "@/stores/ui-store";
import { useChatStore } from "@/stores/chatStore";
import { SidebarHeader } from "./sidebar-header";
import { ProjectGroupList } from "./project-group-list";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Settings, PanelRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function ThreadSidebar() {
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const threads = useChatStore((s) => s.threads);
  const navigate = useNavigate();

  // Collapsed mode
  if (!sidebarOpen) {
    return (
      <div className="h-full flex flex-col items-center py-3 gap-2 bg-sidebar border-r border-border">
        <Button variant="ghost" size="icon" onClick={toggleSidebar} title="Expand sidebar">
          <PanelRight size={16} />
        </Button>
        <div className="flex-1 flex flex-col gap-1 overflow-hidden">
          {threads.slice(0, 10).map((t) => (
            <Tooltip key={t.id}>
              <TooltipTrigger asChild>
                <button
                  className="w-8 h-8 rounded flex items-center justify-center text-[11px] font-medium bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => {
                    useChatStore.getState().setCurrentThread(t.id);
                    navigate(`/chat/${t.id}`);
                  }}
                >
                  {t.title.charAt(0).toUpperCase()}
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">{t.title}</TooltipContent>
            </Tooltip>
          ))}
        </div>
        <Button variant="ghost" size="icon" onClick={() => navigate("/settings")}>
          <Settings size={14} />
        </Button>
      </div>
    );
  }

  // Expanded mode
  return (
    <div className="h-full flex flex-col bg-sidebar border-r border-border select-none">
      <SidebarHeader />
      <ScrollArea className="flex-1">
        <ProjectGroupList />
      </ScrollArea>
      <div className="p-2 border-t border-border flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => navigate("/settings")}>
          <Settings size={12} className="mr-1" />
          Settings
        </Button>
        <Button variant="ghost" size="icon" onClick={toggleSidebar}>
          <PanelRight size={14} />
        </Button>
      </div>
    </div>
  );
}
