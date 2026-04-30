import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Sidebar } from './components/Sidebar/Sidebar';
import { Header } from './components/common/Header';
import { ConfirmDialogManager } from './components/ConfirmDialog';
import { ChatPage } from './pages/ChatPage';
import { SettingsPage } from './pages/SettingsPage';
import { ModelsPage } from './pages/ModelsPage';
import { AppStateProvider } from '../state/AppState';
import { useChatStore } from './stores/chatStore';
import { useSettingsStore } from './store/settings';

export default function App() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const loadSessionsFromDisk = useChatStore((state) => state.loadSessionsFromDisk);
  const loadSettings = useSettingsStore((state) => state.load);

  useEffect(() => {
    loadSessionsFromDisk();
    loadSettings();
  }, []);

  return (
    <AppStateProvider>
      <BrowserRouter>
        <div className="app-container">
          <Header
            sidebarCollapsed={sidebarCollapsed}
            onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
          />
          <div className="app-body">
            <Sidebar collapsed={sidebarCollapsed} />
            <main className="main-content">
              <Routes>
                <Route path="/" element={<ChatPage />} />
                <Route path="/chat/:threadId" element={<ChatPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/settings/models" element={<ModelsPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>
          </div>
          <ConfirmDialogManager />
        </div>
      </BrowserRouter>
    </AppStateProvider>
  );
}
