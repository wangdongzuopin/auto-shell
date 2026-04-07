import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Sidebar } from './components/Sidebar/Sidebar';
import { Header } from './components/common/Header';
import { ConfirmDialogManager } from './components/ConfirmDialog';
import { Home } from './pages/Home';
import { ChatPage } from './pages/ChatPage';
import { KnowledgePage } from './pages/KnowledgePage';
import { SkillsPage } from './pages/SkillsPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { ArtifactsPage } from './pages/ArtifactsPage';
import { SettingsPage } from './pages/SettingsPage';
import { ModelsPage } from './pages/ModelsPage';
import { useChatStore } from './stores/chatStore';
import './styles/global.css';
import './App.css';

export default function App() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const loadSessionsFromDisk = useChatStore((state) => state.loadSessionsFromDisk);

  useEffect(() => {
    loadSessionsFromDisk();
  }, []);

  return (
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
              <Route path="/" element={<Home />} />
              <Route path="/chat/:threadId" element={<ChatPage />} />
              <Route path="/knowledge" element={<KnowledgePage />} />
              <Route path="/skills" element={<SkillsPage />} />
              <Route path="/projects" element={<ProjectsPage />} />
              <Route path="/artifacts" element={<ArtifactsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/settings/models" element={<ModelsPage />} />
            </Routes>
          </main>
        </div>
        <ConfirmDialogManager />
      </div>
    </BrowserRouter>
  );
}