import { useUIStore } from "@/stores/ui-store";

interface AppSidebarLayoutProps {
  children: React.ReactNode;
  sidebar: React.ReactNode;
  rightPanel?: React.ReactNode;
}

export function AppSidebarLayout({ children, sidebar, rightPanel }: AppSidebarLayoutProps) {
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const rightPanelOpen = useUIStore((s) => s.rightPanelOpen);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Left Sidebar */}
      <div
        className="shrink-0 transition-all duration-200 ease-out overflow-hidden"
        style={{ width: sidebarOpen ? 260 : 48 }}
      >
        {sidebar}
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {children}
      </main>

      {/* Right Panel */}
      {rightPanelOpen && rightPanel && (
        <div className="shrink-0 w-[360px] border-l border-border overflow-hidden">
          {rightPanel}
        </div>
      )}
    </div>
  );
}
