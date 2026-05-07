import { useEffect, useState } from "react";
import { useTheme } from "@/hooks/useTheme";
import { useAppStore, type AppRole, type ThemeMode } from "@/stores/appStore";
import { useProjectStore } from "@/stores/projectStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useSkillStore } from "@/stores/skillStore";
import { settingsIpc } from "@/lib/ipc";
import { TitleBar } from "@/components/layout/TitleBar";
import { Sidebar } from "@/components/layout/Sidebar";
import { RoleSwitchOverlay } from "@/components/layout/RoleSwitchOverlay";
import { CommandPalette } from "@/components/layout/CommandPalette";
import { RightPanel } from "@/components/layout/RightPanel";
import { TerminalDrawer } from "@/components/layout/TerminalDrawer";
import { ToastProvider } from "@/components/ui/toast";
import { ChatPage } from "@/pages/ChatPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { OnboardingPage } from "@/pages/OnboardingPage";
import { Hammer } from "lucide-react";

type AppPhase = "loading" | "onboarding" | "ready";

export default function App() {
  useTheme();
  const { mainView, role } = useAppStore();
  const [appPhase, setAppPhase] = useState<AppPhase>("loading");

  useEffect(() => {
    async function init() {
      await Promise.all([
        useProjectStore.getState().loadFromBackend(),
        useSettingsStore.getState().loadSettings(),
        useSkillStore.getState().loadSkills(),
      ]);

      // Restore persisted role/theme
      try {
        const savedRole = await settingsIpc.get("app_role");
        const savedTheme = await settingsIpc.get("app_theme");
        if (savedRole) useAppStore.getState().setRole(savedRole as AppRole);
        if (savedTheme) {
          const theme = savedTheme as ThemeMode;
          document.documentElement.classList.toggle("dark", theme === "dark");
          document.documentElement.classList.toggle("light", theme === "light");
          useAppStore.setState({ theme });
        }
      } catch { /* ignore on first launch */ }

      // Check onboarding
      try {
        const onboarded = await settingsIpc.get("onboarding_completed");
        setAppPhase(onboarded === "true" ? "ready" : "onboarding");
      } catch {
        setAppPhase("onboarding");
      }
    }
    init();
  }, []);

  if (appPhase === "loading") {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-bg-base">
        <div className="flex flex-col items-center gap-4 animate-pulse">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-dev/10 text-accent-dev">
            <Hammer className="h-8 w-8" />
          </div>
          <span className="text-sm text-text-secondary">正在启动 pizz...</span>
        </div>
      </div>
    );
  }

  if (appPhase === "onboarding") {
    return (
      <ToastProvider>
        <OnboardingPage onComplete={() => setAppPhase("ready")} />
      </ToastProvider>
    );
  }

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
