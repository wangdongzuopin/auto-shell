import { useEffect } from "react";
import { useTheme } from "@/hooks/useTheme";
import { useAppStore } from "@/stores/appStore";
import { useProjectStore } from "@/stores/projectStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { TitleBar } from "@/components/layout/TitleBar";
import { Sidebar } from "@/components/layout/Sidebar";
import { RoleSwitchOverlay } from "@/components/layout/RoleSwitchOverlay";
import { CommandPalette } from "@/components/layout/CommandPalette";
import { RightPanel } from "@/components/layout/RightPanel";
import { TerminalDrawer } from "@/components/layout/TerminalDrawer";
import { ToastProvider } from "@/components/ui/toast";
import { ChatPage } from "@/pages/ChatPage";
import { SettingsPage } from "@/pages/SettingsPage";

export default function App() {
  useTheme();
  const { mainView, role } = useAppStore();

  useEffect(() => {
    useProjectStore.getState().loadFromBackend();
    useSettingsStore.getState().loadSettings();
  }, []);

  return (
    <ToastProvider>
      <div
        data-role={role}
        className="flex flex-col h-screen w-screen overflow-hidden bg-bg-base text-text-primary bg-grid"
      >
        <TitleBar />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-hidden relative bg-bg-base">
            {mainView === "chat" ? <ChatPage /> : <SettingsPage />}
            <RoleSwitchOverlay />
          </main>
          <RightPanel />
        </div>
        <TerminalDrawer />
        <CommandPalette />
      </div>
    </ToastProvider>
  );
}
