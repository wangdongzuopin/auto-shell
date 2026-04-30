import React, { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ChatPage } from "./pages/ChatPage";
import { SettingsPage } from "./pages/SettingsPage";
import { ModelsPage } from "./pages/ModelsPage";
import { AppStateProvider } from "../state/AppState";
import { useChatStore } from "./stores/chatStore";
import { useSettingsStore } from "./store/settings";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppSidebarLayout } from "@/components/app-sidebar-layout";
import { ThreadSidebar } from "@/components/thread-sidebar";
import { CommandPalette } from "@/components/command-palette";
import { TerminalDrawer } from "@/components/terminal-drawer";
import { RightPanel } from "@/components/right-panel";
import { StatusBar } from "@/components/status-bar";
import { ToastContainer } from "@/components/ui/toast";

function AppShell() {
  const loadSessionsFromDisk = useChatStore((state) => state.loadSessionsFromDisk);
  const loadSettings = useSettingsStore((state) => state.load);

  useEffect(() => {
    loadSessionsFromDisk();
    loadSettings();
  }, []);

  return (
    <TooltipProvider>
      <CommandPalette />
      <AppSidebarLayout
        sidebar={<ThreadSidebar />}
        rightPanel={<RightPanel />}
      >
        <div className="flex flex-col h-full">
          <div className="flex-1 overflow-hidden">
            <Routes>
              <Route path="/" element={<ChatPage />} />
              <Route path="/chat/:threadId" element={<ChatPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/settings/models" element={<ModelsPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
          <StatusBar />
          <TerminalDrawer />
        </div>
      </AppSidebarLayout>
      <ToastContainer />
    </TooltipProvider>
  );
}

export default function App() {
  return (
    <AppStateProvider>
      <BrowserRouter>
        <AppShell />
      </BrowserRouter>
    </AppStateProvider>
  );
}
