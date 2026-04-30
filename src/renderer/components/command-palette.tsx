import { useEffect } from "react";
import { Command } from "cmdk";
import { useNavigate } from "react-router-dom";
import {
  MessageSquarePlus, FolderOpen, Settings, PanelLeft, Terminal, PanelRightClose,
  Square, Trash2, Search,
} from "lucide-react";
import { useUIStore } from "@/stores/ui-store";
import { useChatStore } from "@/stores/chatStore";
import { useProjectStore } from "@/stores/projectStore";

export function CommandPalette() {
  const open = useUIStore((s) => s.commandPaletteOpen);
  const setOpen = useUIStore((s) => s.setCommandPaletteOpen);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const navigate = useNavigate();
  const threads = useChatStore((s) => s.threads);
  const createThread = useChatStore((s) => s.createThread);
  const deleteThread = useChatStore((s) => s.deleteThread);
  const setCurrentThread = useChatStore((s) => s.setCurrentThread);
  const currentThreadId = useChatStore((s) => s.currentThreadId);
  const projects = useProjectStore((s) => s.projects);
  const setActiveProject = useProjectStore((s) => s.setActiveProject);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(!open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [open, setOpen]);

  const runCommand = (fn: () => void) => {
    setOpen(false);
    fn();
  };

  const handleAddProject = async () => {
    setOpen(false);
    try {
      const folderPath = await window.api.openFolderDialog("Select project folder");
      if (!folderPath) return;
      const exists = await window.api.pathExists(folderPath);
      if (!exists) return;
      const name = folderPath.replace(/[/\\]$/, "").split(/[/\\]/).pop() || folderPath;
      await useProjectStore.getState().addProject({
        id: crypto.randomUUID(),
        name,
        path: folderPath,
        threadIds: [],
        knowledgeIds: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    } catch { /* dialog cancelled */ }
  };

  return (
    <Command.Dialog
      open={open}
      onOpenChange={setOpen}
      label="Command Palette"
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
    >
      <div className="fixed inset-0 bg-black/60" onClick={() => setOpen(false)} />
      <div className="relative w-full max-w-lg rounded-lg border border-border bg-surface shadow-overlay overflow-hidden">
        <div className="flex items-center border-b border-border px-3">
          <Search size={14} className="text-muted-foreground mr-2" />
          <Command.Input
            placeholder="Type a command or search..."
            className="flex-1 h-10 bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground"
          />
        </div>
        <Command.List className="max-h-80 overflow-y-auto p-2">
          <Command.Empty className="py-6 text-center text-xs text-muted-foreground">
            No results found.
          </Command.Empty>

          <Command.Group heading="Threads" className="text-[10px] font-medium text-muted-foreground px-2 py-1.5">
            {threads.slice(0, 10).map((t) => (
              <Command.Item
                key={t.id}
                value={`thread-${t.title}`}
                onSelect={() => runCommand(() => {
                  setCurrentThread(t.id);
                  navigate(`/chat/${t.id}`);
                })}
                className="flex items-center gap-2 px-2 py-1.5 rounded text-xs text-foreground aria-selected:bg-white/5 cursor-pointer"
              >
                <MessageSquarePlus size={12} />
                <span className="truncate">{t.title}</span>
              </Command.Item>
            ))}
            <Command.Item
              onSelect={() => runCommand(() => {
                const t = createThread();
                navigate(`/chat/${t.id}`);
              })}
              className="flex items-center gap-2 px-2 py-1.5 rounded text-xs text-foreground aria-selected:bg-white/5 cursor-pointer"
            >
              <MessageSquarePlus size={12} />
              New thread
            </Command.Item>
            {currentThreadId && (
              <Command.Item
                onSelect={() => runCommand(() => deleteThread(currentThreadId))}
                className="flex items-center gap-2 px-2 py-1.5 rounded text-xs text-destructive aria-selected:bg-white/5 cursor-pointer"
              >
                <Trash2 size={12} />
                Delete current thread
              </Command.Item>
            )}
          </Command.Group>

          <Command.Group heading="Projects" className="text-[10px] font-medium text-muted-foreground px-2 py-1.5">
            <Command.Item
              onSelect={() => runCommand(() => handleAddProject())}
              className="flex items-center gap-2 px-2 py-1.5 rounded text-xs text-foreground aria-selected:bg-white/5 cursor-pointer"
            >
              <FolderOpen size={12} />
              Import folder...
            </Command.Item>
            {projects.map((p) => (
              <Command.Item
                key={p.id}
                value={`project-${p.name}`}
                onSelect={() => runCommand(() => setActiveProject(p.id))}
                className="flex items-center gap-2 px-2 py-1.5 rounded text-xs text-foreground aria-selected:bg-white/5 cursor-pointer"
              >
                <FolderOpen size={12} />
                <span className="truncate">{p.name}</span>
              </Command.Item>
            ))}
          </Command.Group>

          <Command.Group heading="View" className="text-[10px] font-medium text-muted-foreground px-2 py-1.5">
            <Command.Item
              onSelect={() => runCommand(() => toggleSidebar())}
              className="flex items-center gap-2 px-2 py-1.5 rounded text-xs text-foreground aria-selected:bg-white/5 cursor-pointer"
            >
              <PanelLeft size={12} />
              Toggle sidebar
            </Command.Item>
            <Command.Item
              onSelect={() => runCommand(() => {
                const store = useUIStore.getState();
                if (store.rightPanelOpen) store.closeRightPanel();
                else store.openRightPanel("diff");
              })}
              className="flex items-center gap-2 px-2 py-1.5 rounded text-xs text-foreground aria-selected:bg-white/5 cursor-pointer"
            >
              <PanelRightClose size={12} />
              Toggle right panel
            </Command.Item>
            <Command.Item
              onSelect={() => runCommand(() => {/* handled by TerminalDrawer */})}
              className="flex items-center gap-2 px-2 py-1.5 rounded text-xs text-foreground aria-selected:bg-white/5 cursor-pointer"
            >
              <Terminal size={12} />
              Toggle terminal
            </Command.Item>
          </Command.Group>

          <Command.Group heading="Actions" className="text-[10px] font-medium text-muted-foreground px-2 py-1.5">
            <Command.Item
              onSelect={() => runCommand(() => navigate("/settings"))}
              className="flex items-center gap-2 px-2 py-1.5 rounded text-xs text-foreground aria-selected:bg-white/5 cursor-pointer"
            >
              <Settings size={12} />
              Open settings
            </Command.Item>
          </Command.Group>
        </Command.List>
      </div>
    </Command.Dialog>
  );
}
