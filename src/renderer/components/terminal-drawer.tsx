import { useEffect, useRef, useCallback, useState } from "react";
import { Terminal as XTermTerminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { X, Plus, ChevronUp, GripHorizontal } from "lucide-react";
import { useTerminalStore } from "@/stores/terminal-store";
import { cn } from "@/lib/utils";

export function TerminalDrawer() {
  const open = useTerminalStore((s) => s.open);
  const tabs = useTerminalStore((s) => s.tabs);
  const activeTabId = useTerminalStore((s) => s.activeTabId);
  const closeTerminal = useTerminalStore((s) => s.closeTerminal);
  const addTab = useTerminalStore((s) => s.addTab);
  const closeTab = useTerminalStore((s) => s.closeTab);
  const setActiveTab = useTerminalStore((s) => s.setActiveTab);

  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTermTerminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const [height, setHeight] = useState(40 * window.innerHeight / 100);
  const dragStartRef = useRef<{ y: number; height: number } | null>(null);

  // Initialize xterm for the active tab
  useEffect(() => {
    if (!open || !activeTabId || !terminalRef.current) return;

    const container = terminalRef.current;
    container.innerHTML = "";

    const term = new XTermTerminal({
      cursorBlink: true,
      fontFamily: '"Cascadia Code", "JetBrains Mono", "Fira Code", monospace',
      fontSize: 12,
      theme: {
        background: "#0a0e13",
        foreground: "#e6edf3",
        cursor: "#58d68d",
      },
      allowProposedApi: true,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.loadAddon(new WebLinksAddon());

    term.open(container);
    fitAddon.fit();

    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    const handleResize = () => fitAddon.fit();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      term.dispose();
      xtermRef.current = null;
      fitAddonRef.current = null;
    };
  }, [open, activeTabId]);

  // Refit when height changes
  useEffect(() => {
    setTimeout(() => fitAddonRef.current?.fit(), 50);
  }, [height]);

  // Keyboard shortcut: Ctrl+`
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "`" && e.ctrlKey) {
        e.preventDefault();
        useTerminalStore.getState().toggle();
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  // Drag resize handlers
  const handleDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragStartRef.current = { y: e.clientY, height };
    const onMove = (ev: MouseEvent) => {
      if (!dragStartRef.current) return;
      const delta = dragStartRef.current.y - ev.clientY;
      const newHeight = Math.min(Math.max(dragStartRef.current.height + delta, 120), window.innerHeight * 0.7);
      setHeight(newHeight);
    };
    const onUp = () => {
      dragStartRef.current = null;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [height]);

  if (!open) return null;

  return (
    <div className="shrink-0 border-t border-border bg-sidebar flex flex-col" style={{ height }}>
      {/* Drag handle */}
      <div
        className="flex items-center justify-center h-5 cursor-ns-resize hover:bg-white/5 transition-colors shrink-0"
        onMouseDown={handleDragStart}
      >
        <GripHorizontal size={12} className="text-muted-foreground" />
      </div>

      {/* Tab bar */}
      <div className="flex items-center px-2 gap-1 shrink-0 border-b border-border">
        <div className="flex-1 flex items-center gap-1 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={cn(
                "flex items-center gap-1 px-2 py-1 text-[11px] rounded-t transition-colors shrink-0",
                tab.id === activeTabId
                  ? "bg-surface text-foreground border-t border-l border-r border-border"
                  : "text-muted-foreground hover:text-foreground"
              )}
              onClick={() => setActiveTab(tab.id)}
            >
              <span>{tab.name}</span>
              <span
                className="hover:text-destructive ml-0.5"
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(tab.id);
                }}
              >
                <X size={10} />
              </span>
            </button>
          ))}
        </div>
        <button
          className="p-0.5 text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => addTab()}
          title="New terminal"
        >
          <Plus size={12} />
        </button>
        <button
          className="p-0.5 text-muted-foreground hover:text-foreground transition-colors"
          onClick={closeTerminal}
        >
          <ChevronUp size={14} />
        </button>
      </div>

      {/* xterm container */}
      <div ref={terminalRef} className="flex-1 overflow-hidden" />
    </div>
  );
}
